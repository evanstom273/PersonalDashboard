import {
	fetchFileContent,
	type GitHubRateLimit,
} from '@/services/github/githubApiService'
import type {
	DevStudioPullRequest,
	DevStudioPushResult,
	DevStudioRepoRef,
	DevStudioStagedChange,
} from '@/types/devStudio'
import { filterFilePaths } from '@/utils/devStudioFileTree'

const MAX_READ_CHARS = 60_000
const MAX_SEARCH_FILES = 24
const MAX_SEARCH_RESULTS = 40

export interface DevStudioToolContext {
	token: string
	repo: DevStudioRepoRef
	filePaths: string[]
	pullRequests: DevStudioPullRequest[]
	getStagedChanges: () => DevStudioStagedChange[]
	stageChange: (change: Omit<DevStudioStagedChange, 'id'>) => Promise<void>
	pushStagedChanges: (
		commitMessage: string,
		pullRequestTitle: string,
	) => Promise<DevStudioPushResult>
	mergePullRequest: (
		pullNumber: number,
		mergeMethod?: 'merge' | 'squash' | 'rebase',
	) => Promise<{ merged: boolean; sha?: string; message?: string }>
	closePullRequest: (pullNumber: number) => Promise<void>
	refreshWorkspace: () => Promise<void>
	getCachedSha: (path: string) => string | undefined
	setCachedSha: (path: string, sha: string) => void
	onRateLimit?: (rateLimit: GitHubRateLimit | null) => void
}

export interface DevStudioToolResult {
	name: string
	response: Record<string, unknown>
}

export const DEV_STUDIO_TOOL_DECLARATIONS = [
	{
		name: 'list_workspace_files',
		description:
			'List file paths in the connected GitHub repository workspace. Use before reading or editing files.',
		parameters: {
			type: 'OBJECT',
			properties: {
				path_prefix: {
					type: 'STRING',
					description: 'Optional path prefix filter, e.g. "src/services/".',
				},
			},
		},
	},
	{
		name: 'read_workspace_file',
		description: 'Read one file from the connected repository workspace.',
		parameters: {
			type: 'OBJECT',
			properties: {
				path: {
					type: 'STRING',
					description: 'Repository file path, e.g. "src/App.tsx".',
				},
			},
			required: ['path'],
		},
	},
	{
		name: 'search_workspace_code',
		description:
			'Search file contents in the connected repository for a string or regex pattern.',
		parameters: {
			type: 'OBJECT',
			properties: {
				query: { type: 'STRING', description: 'Text or regex pattern.' },
				path_prefix: {
					type: 'STRING',
					description: 'Optional path prefix to limit search scope.',
				},
				case_sensitive: {
					type: 'BOOLEAN',
					description: 'Whether the search is case-sensitive. Defaults to false.',
				},
			},
			required: ['query'],
		},
	},
	{
		name: 'stage_workspace_file',
		description:
			'Stage a full-file edit for user review in Diff before anything is pushed to GitHub. Provide the complete new file content.',
		parameters: {
			type: 'OBJECT',
			properties: {
				path: { type: 'STRING', description: 'Repository file path to edit.' },
				content: {
					type: 'STRING',
					description: 'Complete new file content after your edit.',
				},
			},
			required: ['path', 'content'],
		},
	},
	{
		name: 'list_staged_changes',
		description:
			'List files currently staged in Dev Studio waiting for Diff review or push.',
		parameters: { type: 'OBJECT', properties: {} },
	},
	{
		name: 'list_pull_requests',
		description: 'List open pull requests for the connected repository.',
		parameters: { type: 'OBJECT', properties: {} },
	},
	{
		name: 'push_staged_changes',
		description:
			'Push all staged changes to a new branch and open a pull request. Only call when the user explicitly asks to push or open a PR.',
		parameters: {
			type: 'OBJECT',
			properties: {
				commit_message: { type: 'STRING', description: 'Git commit message.' },
				pull_request_title: { type: 'STRING', description: 'Pull request title.' },
			},
			required: ['commit_message', 'pull_request_title'],
		},
	},
	{
		name: 'merge_pull_request',
		description:
			'Merge an open pull request by number. Only call when the user explicitly asks to merge.',
		parameters: {
			type: 'OBJECT',
			properties: {
				pull_number: { type: 'INTEGER', description: 'Pull request number, e.g. 42.' },
				merge_method: {
					type: 'STRING',
					description: 'Optional: merge, squash, or rebase. Defaults to squash.',
				},
			},
			required: ['pull_number'],
		},
	},
	{
		name: 'close_pull_request',
		description:
			'Close an open pull request without merging. Only call when the user explicitly asks to close.',
		parameters: {
			type: 'OBJECT',
			properties: {
				pull_number: { type: 'INTEGER', description: 'Pull request number to close.' },
			},
			required: ['pull_number'],
		},
	},
] as const

const DEV_STUDIO_TOOL_NAMES = new Set<string>(
	DEV_STUDIO_TOOL_DECLARATIONS.map((tool) => tool.name),
)

export function isDevStudioToolName(name: string): boolean {
	return DEV_STUDIO_TOOL_NAMES.has(name)
}

function normalizePath(value: string): string {
	return value.trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function parsePullNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.trunc(value)
	}
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number.parseInt(value.trim(), 10)
		return Number.isFinite(parsed) ? parsed : null
	}
	return null
}

function parseMergeMethod(
	value: unknown,
): 'merge' | 'squash' | 'rebase' | undefined {
	if (typeof value !== 'string') {
		return undefined
	}
	const normalized = value.trim().toLowerCase()
	if (normalized === 'merge' || normalized === 'squash' || normalized === 'rebase') {
		return normalized
	}
	return undefined
}

async function readWorkspaceFileContent(
	context: DevStudioToolContext,
	path: string,
): Promise<{ content: string; sha: string }> {
	const normalized = normalizePath(path)
	const result = await fetchFileContent(context.token, context.repo, normalized)
	context.setCachedSha(normalized, result.sha)
	context.onRateLimit?.(result.rateLimit)
	return { content: result.content, sha: result.sha }
}

export async function executeDevStudioToolCall(
	name: string,
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	switch (name) {
		case 'list_workspace_files':
			return listWorkspaceFiles(args, context)
		case 'read_workspace_file':
			return await readWorkspaceFile(args, context)
		case 'search_workspace_code':
			return await searchWorkspaceCode(args, context)
		case 'stage_workspace_file':
			return await stageWorkspaceFile(args, context)
		case 'list_staged_changes':
			return listStagedChanges(context)
		case 'list_pull_requests':
			return listPullRequests(context)
		case 'push_staged_changes':
			return await pushStagedChangesTool(args, context)
		case 'merge_pull_request':
			return await mergePullRequestTool(args, context)
		case 'close_pull_request':
			return await closePullRequestTool(args, context)
		default:
			return { name, response: { error: `Unknown Dev Studio tool: ${name}` } }
	}
}

function listWorkspaceFiles(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): DevStudioToolResult {
	const pathPrefix =
		typeof args.path_prefix === 'string' ? args.path_prefix : undefined
	const paths = filterFilePaths(context.filePaths, pathPrefix)

	return {
		name: 'list_workspace_files',
		response: {
			repository: `${context.repo.owner}/${context.repo.repo}`,
			branch: context.repo.branch,
			count: paths.length,
			paths: paths.slice(0, 500),
		},
	}
}

function listStagedChanges(context: DevStudioToolContext): DevStudioToolResult {
	const staged = context.getStagedChanges()
	return {
		name: 'list_staged_changes',
		response: {
			count: staged.length,
			changes: staged.map((change) => ({
				path: change.path,
				status: change.status,
				source: change.source,
			})),
		},
	}
}

function listPullRequests(context: DevStudioToolContext): DevStudioToolResult {
	return {
		name: 'list_pull_requests',
		response: {
			repository: `${context.repo.owner}/${context.repo.repo}`,
			count: context.pullRequests.length,
			pull_requests: context.pullRequests.map((pull) => ({
				number: pull.number,
				title: pull.title,
				state: pull.state,
				head_ref: pull.headRef,
				base_ref: pull.baseRef,
				updated_at: pull.updatedAt,
			})),
		},
	}
}

async function pushStagedChangesTool(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	const commitMessage =
		typeof args.commit_message === 'string' ? args.commit_message.trim() : ''
	const pullRequestTitle =
		typeof args.pull_request_title === 'string'
			? args.pull_request_title.trim()
			: ''

	if (!commitMessage || !pullRequestTitle) {
		return {
			name: 'push_staged_changes',
			response: { error: 'commit_message and pull_request_title are required.' },
		}
	}

	if (context.getStagedChanges().length === 0) {
		return {
			name: 'push_staged_changes',
			response: { error: 'No staged changes to push.' },
		}
	}

	try {
		const result = await context.pushStagedChanges(commitMessage, pullRequestTitle)
		await context.refreshWorkspace()
		return {
			name: 'push_staged_changes',
			response: {
				pushed: true,
				branch_name: result.branchName,
				pull_request_number: result.pullRequestNumber,
				pull_request_url: result.pullRequestUrl,
			},
		}
	} catch (error) {
		return {
			name: 'push_staged_changes',
			response: {
				error: error instanceof Error ? error.message : 'Could not push changes.',
			},
		}
	}
}

async function mergePullRequestTool(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	const pullNumber = parsePullNumber(args.pull_number)
	if (!pullNumber) {
		return {
			name: 'merge_pull_request',
			response: { error: 'pull_number is required.' },
		}
	}

	try {
		const result = await context.mergePullRequest(
			pullNumber,
			parseMergeMethod(args.merge_method),
		)
		await context.refreshWorkspace()
		return {
			name: 'merge_pull_request',
			response: {
				pull_number: pullNumber,
				merged: result.merged,
				sha: result.sha,
				message: result.message,
			},
		}
	} catch (error) {
		return {
			name: 'merge_pull_request',
			response: {
				error: error instanceof Error ? error.message : 'Could not merge pull request.',
			},
		}
	}
}

async function closePullRequestTool(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	const pullNumber = parsePullNumber(args.pull_number)
	if (!pullNumber) {
		return {
			name: 'close_pull_request',
			response: { error: 'pull_number is required.' },
		}
	}

	try {
		await context.closePullRequest(pullNumber)
		await context.refreshWorkspace()
		return {
			name: 'close_pull_request',
			response: {
				pull_number: pullNumber,
				closed: true,
			},
		}
	} catch (error) {
		return {
			name: 'close_pull_request',
			response: {
				error: error instanceof Error ? error.message : 'Could not close pull request.',
			},
		}
	}
}

async function readWorkspaceFile(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	const path = typeof args.path === 'string' ? normalizePath(args.path) : ''
	if (!path) {
		return {
			name: 'read_workspace_file',
			response: { error: 'path is required.' },
		}
	}

	if (!context.filePaths.includes(path)) {
		return {
			name: 'read_workspace_file',
			response: { error: `File not found in workspace tree: ${path}` },
		}
	}

	try {
		const file = await readWorkspaceFileContent(context, path)
		const truncated = file.content.length > MAX_READ_CHARS
		return {
			name: 'read_workspace_file',
			response: {
				path,
				sha: file.sha,
				content: truncated
					? `${file.content.slice(0, MAX_READ_CHARS)}\n\n[Truncated for context length.]`
					: file.content,
				truncated,
			},
		}
	} catch (error) {
		return {
			name: 'read_workspace_file',
			response: {
				error: error instanceof Error ? error.message : 'Could not read file.',
			},
		}
	}
}

async function searchWorkspaceCode(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	const query = typeof args.query === 'string' ? args.query.trim() : ''
	if (!query) {
		return {
			name: 'search_workspace_code',
			response: { error: 'query is required.' },
		}
	}

	const pathPrefix =
		typeof args.path_prefix === 'string' ? args.path_prefix : undefined
	const caseSensitive = args.case_sensitive === true
	const paths = filterFilePaths(context.filePaths, pathPrefix).slice(
		0,
		MAX_SEARCH_FILES,
	)

	let pattern: RegExp
	try {
		pattern = new RegExp(query, caseSensitive ? 'g' : 'gi')
	} catch {
		pattern = new RegExp(
			query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
			caseSensitive ? 'g' : 'gi',
		)
	}

	const matches: Array<{ path: string; line: number; text: string }> = []

	for (const path of paths) {
		if (matches.length >= MAX_SEARCH_RESULTS) {
			break
		}

		try {
			const file = await readWorkspaceFileContent(context, path)
			const lines = file.content.split('\n')
			for (let index = 0; index < lines.length; index += 1) {
				if (matches.length >= MAX_SEARCH_RESULTS) {
					break
				}
				const line = lines[index]
				pattern.lastIndex = 0
				if (pattern.test(line)) {
					matches.push({
						path,
						line: index + 1,
						text: line.trim().slice(0, 240),
					})
				}
			}
		} catch {
			// Skip unreadable files during search.
		}
	}

	return {
		name: 'search_workspace_code',
		response: {
			query,
			match_count: matches.length,
			matches,
		},
	}
}

async function stageWorkspaceFile(
	args: Record<string, unknown>,
	context: DevStudioToolContext,
): Promise<DevStudioToolResult> {
	const path = typeof args.path === 'string' ? normalizePath(args.path) : ''
	const content = typeof args.content === 'string' ? args.content : ''
	if (!path) {
		return {
			name: 'stage_workspace_file',
			response: { error: 'path is required.' },
		}
	}

	try {
		let oldContent = ''
		let baseSha = context.getCachedSha(path)
		let status: DevStudioStagedChange['status'] = 'modified'

		if (context.filePaths.includes(path)) {
			const existing = await readWorkspaceFileContent(context, path)
			oldContent = existing.content
			baseSha = existing.sha
		} else {
			status = 'added'
		}

		if (oldContent === content) {
			return {
				name: 'stage_workspace_file',
				response: {
					path,
					staged: false,
					message: 'Content matches the current file — nothing to stage.',
				},
			}
		}

		await context.stageChange({
			path,
			status,
			oldContent,
			newContent: content,
			source: 'agent',
			baseSha,
		})

		return {
			name: 'stage_workspace_file',
			response: {
				path,
				staged: true,
				status,
				message: 'Staged for Diff review. User can push from Diff or ask you to push.',
			},
		}
	} catch (error) {
		return {
			name: 'stage_workspace_file',
			response: {
				error: error instanceof Error ? error.message : 'Could not stage file.',
			},
		}
	}
}
