import type {
	DevStudioFileNode,
	DevStudioPullRequest,
	DevStudioRepoRef,
	GitHubPagesBuildResponse,
	GitHubPagesDeploymentInfo,
	GitHubWorkflowRunResponse,
} from '@/types/devStudio'
import { buildPatPermissionErrorHint } from '@/utils/githubPatHelp'

const GITHUB_API = 'https://api.github.com'

export interface GitHubRateLimit {
	remaining: number
	limit: number
	resetAt: number
}

export class GitHubApiError extends Error {
	status: number
	step?: string
	requiredPermissions?: string

	constructor(
		message: string,
		status: number,
		options?: { step?: string; requiredPermissions?: string },
	) {
		super(message)
		this.name = 'GitHubApiError'
		this.status = status
		this.step = options?.step
		this.requiredPermissions = options?.requiredPermissions
	}

	formatWithPatHint(): string {
		if (
			this.status !== 403 ||
			!this.message.includes('Resource not accessible by personal access token')
		) {
			return this.message
		}

		return `${this.message}\n\n${buildPatPermissionErrorHint({
			step: this.step,
			requiredPermissions: this.requiredPermissions,
		})}`
	}
}

function parseRateLimit(response: Response): GitHubRateLimit | null {
	const remaining = response.headers.get('x-ratelimit-remaining')
	const limit = response.headers.get('x-ratelimit-limit')
	const reset = response.headers.get('x-ratelimit-reset')

	if (!remaining || !limit || !reset) {
		return null
	}

	return {
		remaining: Number(remaining),
		limit: Number(limit),
		resetAt: Number(reset) * 1000,
	}
}

async function githubFetch<T>(
	token: string,
	path: string,
	init?: RequestInit,
	options?: { step?: string },
): Promise<{ data: T; rateLimit: GitHubRateLimit | null }> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		Authorization: `Bearer ${token}`,
		'X-GitHub-Api-Version': '2022-11-28',
	}

	if (init?.body) {
		headers['Content-Type'] = 'application/json'
	}

	const response = await fetch(`${GITHUB_API}${path}`, {
		...init,
		headers: {
			...headers,
			...(init?.headers as Record<string, string> | undefined),
		},
	})

	const rateLimit = parseRateLimit(response)

	if (!response.ok) {
		let message = `GitHub API error (${response.status})`
		const requiredPermissions =
			response.headers.get('x-accepted-github-permissions') ?? undefined
		try {
			const body = (await response.json()) as { message?: string }
			if (body.message) {
				message = body.message
			}
		} catch {
			// Ignore JSON parse failures.
		}
		throw new GitHubApiError(message, response.status, {
			step: options?.step,
			requiredPermissions,
		})
	}

	const data = (await response.json()) as T
	return { data, rateLimit }
}

interface GitTreeResponse {
	tree: Array<{
		path: string
		mode: string
		type: 'blob' | 'tree' | 'commit'
		sha: string
	}>
	truncated: boolean
}

interface GitHubPullResponse {
	id: number
	number: number
	title: string
	state: 'open' | 'closed'
	merged_at: string | null
	head: { ref: string }
	base: { ref: string }
	updated_at: string
}

function buildFileTree(
	entries: GitTreeResponse['tree'],
): DevStudioFileNode[] {
	const root: DevStudioFileNode[] = []
	const dirMap = new Map<string, DevStudioFileNode>()

	for (const entry of entries) {
		if (entry.type !== 'blob') {
			continue
		}

		const parts = entry.path.split('/')
		const fileName = parts.pop()
		if (!fileName) {
			continue
		}

		let currentChildren = root
		let currentPath = ''

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part
			let dirNode = dirMap.get(currentPath)

			if (!dirNode) {
				dirNode = {
					path: currentPath,
					type: 'dir',
					children: [],
				}
				dirMap.set(currentPath, dirNode)
				currentChildren.push(dirNode)
			}

			currentChildren = dirNode.children ?? []
		}

		currentChildren.push({
			path: entry.path,
			type: 'file',
			sha: entry.sha,
		})
	}

	function sortNodes(nodes: DevStudioFileNode[]): DevStudioFileNode[] {
		return [...nodes]
			.sort((a, b) => {
				if (a.type !== b.type) {
					return a.type === 'dir' ? -1 : 1
				}
				return a.path.localeCompare(b.path)
			})
			.map((node) =>
				node.children
					? { ...node, children: sortNodes(node.children) }
					: node,
			)
	}

	return sortNodes(root)
}

export interface GitHubRepositorySummary {
	fullName: string
	defaultBranch: string
	isPrivate: boolean
	updatedAt: string
}

interface GitHubRepoListResponse {
	full_name: string
	default_branch: string
	private: boolean
	updated_at: string
}

export async function listAccessibleRepositories(
	token: string,
): Promise<{
	repositories: GitHubRepositorySummary[]
	rateLimit: GitHubRateLimit | null
}> {
	const repositories: GitHubRepositorySummary[] = []
	let page = 1
	let rateLimit: GitHubRateLimit | null = null

	while (page <= 10) {
		const result = await githubFetch<GitHubRepoListResponse[]>(
			token,
			`/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
		)

		rateLimit = result.rateLimit ?? rateLimit

		if (result.data.length === 0) {
			break
		}

		for (const repo of result.data) {
			repositories.push({
				fullName: repo.full_name,
				defaultBranch: repo.default_branch || 'main',
				isPrivate: repo.private,
				updatedAt: repo.updated_at,
			})
		}

		if (result.data.length < 100) {
			break
		}

		page += 1
	}

	return { repositories, rateLimit }
}

export interface CreateRepositoryInput {
	name: string
	description?: string
	isPrivate?: boolean
	autoInit?: boolean
}

export async function createRepository(
	token: string,
	input: CreateRepositoryInput,
): Promise<{
	repository: GitHubRepositorySummary
	rateLimit: GitHubRateLimit | null
}> {
	const name = input.name.trim()
	if (!name) {
		throw new GitHubApiError('Repository name is required.', 400)
	}

	const { data, rateLimit } = await githubFetch<GitHubRepoListResponse>(
		token,
		'/user/repos',
		{
			method: 'POST',
			body: JSON.stringify({
				name,
				description: input.description?.trim() || undefined,
				private: input.isPrivate ?? true,
				auto_init: input.autoInit ?? true,
			}),
		},
	)

	return {
		repository: {
			fullName: data.full_name,
			defaultBranch: data.default_branch || 'main',
			isPrivate: data.private,
			updatedAt: data.updated_at,
		},
		rateLimit,
	}
}

export async function fetchRepositoryTree(
	token: string,
	repo: DevStudioRepoRef,
): Promise<{ tree: DevStudioFileNode[]; truncated: boolean; rateLimit: GitHubRateLimit | null }> {
	const { data, rateLimit } = await githubFetch<GitTreeResponse>(
		token,
		`/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(repo.branch)}?recursive=1`,
	)

	return {
		tree: buildFileTree(data.tree),
		truncated: data.truncated,
		rateLimit,
	}
}

export async function listOpenPullRequests(
	token: string,
	repo: DevStudioRepoRef,
): Promise<{ pullRequests: DevStudioPullRequest[]; rateLimit: GitHubRateLimit | null }> {
	const { data, rateLimit } = await githubFetch<GitHubPullResponse[]>(
		token,
		`/repos/${repo.owner}/${repo.repo}/pulls?state=open&per_page=30`,
	)

	return {
		pullRequests: data.map((pull) => ({
			id: pull.id,
			number: pull.number,
			title: pull.title,
			state: pull.state,
			merged: Boolean(pull.merged_at),
			headRef: pull.head.ref,
			baseRef: pull.base.ref,
			updatedAt: pull.updated_at,
		})),
		rateLimit,
	}
}

export async function fetchFileContent(
	token: string,
	repo: DevStudioRepoRef,
	path: string,
): Promise<{ content: string; sha: string; rateLimit: GitHubRateLimit | null }> {
	const { data, rateLimit } = await githubFetch<{
		content: string
		sha: string
		encoding: string
	}>(
		token,
		`/repos/${repo.owner}/${repo.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(repo.branch)}`,
	)

	if (data.encoding !== 'base64') {
		throw new GitHubApiError('Unsupported file encoding from GitHub.', 415)
	}

	const content = atob(data.content.replace(/\n/g, ''))
	return { content, sha: data.sha, rateLimit }
}

interface GitRefResponse {
	object: { sha: string; type: string }
}

interface GitCommitResponse {
	sha: string
	tree: { sha: string }
}

interface GitBlobResponse {
	sha: string
}

interface GitTreeResponseCreate {
	sha: string
}

interface GitHubPullCreateResponse {
	number: number
	html_url: string
}

export interface PushStagedChangeInput {
	path: string
	status: 'added' | 'modified' | 'deleted'
	content: string
}

function encodeRepoPath(repo: DevStudioRepoRef): string {
	return `/repos/${repo.owner}/${repo.repo}`
}

export async function pushStagedChangesAndOpenPullRequest(
	token: string,
	repo: DevStudioRepoRef,
	input: {
		baseBranch: string
		branchName: string
		commitMessage: string
		pullRequestTitle: string
		pullRequestBody?: string
		changes: PushStagedChangeInput[]
	},
): Promise<{
	result: {
		branchName: string
		commitSha: string
		pullRequestNumber: number
		pullRequestUrl: string
	}
	rateLimit: GitHubRateLimit | null
}> {
	if (input.changes.length === 0) {
		throw new GitHubApiError('No staged changes to push.', 400)
	}

	let rateLimit: GitHubRateLimit | null = null

	const baseRef = await githubFetch<GitRefResponse>(
		token,
		`${encodeRepoPath(repo)}/git/ref/heads/${encodeURIComponent(input.baseBranch)}`,
		undefined,
		{ step: 'reading base branch' },
	)
	rateLimit = baseRef.rateLimit ?? rateLimit
	const baseCommitSha = baseRef.data.object.sha

	try {
		await githubFetch(
			token,
			`${encodeRepoPath(repo)}/git/refs`,
			{
				method: 'POST',
				body: JSON.stringify({
					ref: `refs/heads/${input.branchName}`,
					sha: baseCommitSha,
				}),
			},
			{ step: 'creating branch' },
		)
	} catch (error) {
		if (!(error instanceof GitHubApiError) || error.status !== 422) {
			throw error
		}
	}

	const branchRef = await githubFetch<GitRefResponse>(
		token,
		`${encodeRepoPath(repo)}/git/ref/heads/${encodeURIComponent(input.branchName)}`,
		undefined,
		{ step: 'reading push branch' },
	)
	rateLimit = branchRef.rateLimit ?? rateLimit
	const branchTipSha = branchRef.data.object.sha

	const branchTipCommit = await githubFetch<GitCommitResponse>(
		token,
		`${encodeRepoPath(repo)}/git/commits/${branchTipSha}`,
		undefined,
		{ step: 'reading branch commit' },
	)
	rateLimit = branchTipCommit.rateLimit ?? rateLimit
	const baseTreeSha = branchTipCommit.data.tree.sha

	const treeEntries: Array<{
		path: string
		mode: '100644'
		type: 'blob'
		sha: string | null
	}> = []

	for (const change of input.changes) {
		if (change.status === 'deleted') {
			treeEntries.push({
				path: change.path,
				mode: '100644',
				type: 'blob',
				sha: null,
			})
			continue
		}

		const blob = await githubFetch<GitBlobResponse>(
			token,
			`${encodeRepoPath(repo)}/git/blobs`,
			{
				method: 'POST',
				body: JSON.stringify({
					content: change.content,
					encoding: 'utf-8',
				}),
			},
			{ step: `uploading ${change.path}` },
		)
		rateLimit = blob.rateLimit ?? rateLimit
		treeEntries.push({
			path: change.path,
			mode: '100644',
			type: 'blob',
			sha: blob.data.sha,
		})
	}

	const tree = await githubFetch<GitTreeResponseCreate>(
		token,
		`${encodeRepoPath(repo)}/git/trees`,
		{
			method: 'POST',
			body: JSON.stringify({
				base_tree: baseTreeSha,
				tree: treeEntries,
			}),
		},
		{ step: 'building commit tree' },
	)
	rateLimit = tree.rateLimit ?? rateLimit

	const commit = await githubFetch<GitCommitResponse>(
		token,
		`${encodeRepoPath(repo)}/git/commits`,
		{
			method: 'POST',
			body: JSON.stringify({
				message: input.commitMessage,
				tree: tree.data.sha,
				parents: [branchTipSha],
			}),
		},
		{ step: 'creating commit' },
	)
	rateLimit = commit.rateLimit ?? rateLimit

	await githubFetch(
		token,
		`${encodeRepoPath(repo)}/git/refs/heads/${encodeURIComponent(input.branchName)}`,
		{
			method: 'PATCH',
			body: JSON.stringify({ sha: commit.data.sha, force: true }),
		},
		{ step: 'updating branch' },
	)

	let pullNumber: number
	let pullRequestUrl: string

	try {
		const pull = await githubFetch<GitHubPullCreateResponse>(
			token,
			`${encodeRepoPath(repo)}/pulls`,
			{
				method: 'POST',
				body: JSON.stringify({
					title: input.pullRequestTitle,
					body: input.pullRequestBody ?? input.commitMessage,
					head: input.branchName,
					base: input.baseBranch,
				}),
			},
			{ step: 'opening pull request' },
		)
		rateLimit = pull.rateLimit ?? rateLimit
		pullNumber = pull.data.number
		pullRequestUrl = pull.data.html_url
	} catch (error) {
		if (!(error instanceof GitHubApiError) || error.status !== 422) {
			throw error
		}

		const existing = await findOpenPullRequestForHead(token, repo, input.branchName)
		if (!existing) {
			throw error
		}
		rateLimit = existing.rateLimit ?? rateLimit
		pullNumber = existing.pullRequest.number
		pullRequestUrl = `https://github.com/${repo.owner}/${repo.repo}/pull/${existing.pullRequest.number}`
	}

	return {
		result: {
			branchName: input.branchName,
			commitSha: commit.data.sha,
			pullRequestNumber: pullNumber,
			pullRequestUrl,
		},
		rateLimit,
	}
}

async function findOpenPullRequestForHead(
	token: string,
	repo: DevStudioRepoRef,
	branchName: string,
): Promise<{
	pullRequest: GitHubPullResponse
	rateLimit: GitHubRateLimit | null
} | null> {
	const head = `${repo.owner}:${branchName}`
	const result = await githubFetch<GitHubPullResponse[]>(
		token,
		`${encodeRepoPath(repo)}/pulls?state=open&head=${encodeURIComponent(head)}&per_page=5`,
		undefined,
		{ step: 'finding existing pull request' },
	)

	const match = result.data.find(
		(pull) => pull.head.ref === branchName && pull.state === 'open',
	)

	return match ? { pullRequest: match, rateLimit: result.rateLimit } : null
}

export async function mergePullRequest(
	token: string,
	repo: DevStudioRepoRef,
	pullNumber: number,
	options?: {
		mergeMethod?: 'merge' | 'squash' | 'rebase'
		commitTitle?: string
	},
): Promise<{
	merged: boolean
	sha?: string
	message?: string
	rateLimit: GitHubRateLimit | null
}> {
	const result = await githubFetch<{
		merged: boolean
		sha?: string
		message?: string
	}>(
		token,
		`${encodeRepoPath(repo)}/pulls/${pullNumber}/merge`,
		{
			method: 'PUT',
			body: JSON.stringify({
				merge_method: options?.mergeMethod ?? 'squash',
				commit_title: options?.commitTitle,
			}),
		},
	)

	return {
		...result.data,
		rateLimit: result.rateLimit,
	}
}

export async function closePullRequest(
	token: string,
	repo: DevStudioRepoRef,
	pullNumber: number,
): Promise<{ rateLimit: GitHubRateLimit | null }> {
	const result = await githubFetch<GitHubPullResponse>(
		token,
		`${encodeRepoPath(repo)}/pulls/${pullNumber}`,
		{
			method: 'PATCH',
			body: JSON.stringify({ state: 'closed' }),
		},
	)

	return { rateLimit: result.rateLimit }
}

export async function getPagesBuildStatus(
	token: string,
	repo: DevStudioRepoRef,
): Promise<{
	build: GitHubPagesBuildResponse | null
	pagesConfig: { htmlUrl?: string; status?: string } | null
	rateLimit: GitHubRateLimit | null
}> {
	let rateLimit: GitHubRateLimit | null = null
	let pagesConfig: { htmlUrl?: string; status?: string } | null = null
	let build: GitHubPagesBuildResponse | null = null

	try {
		const pagesRes = await githubFetch<{ html_url?: string; status?: string }>(
			token,
			`${encodeRepoPath(repo)}/pages`,
		)
		rateLimit = pagesRes.rateLimit ?? rateLimit
		pagesConfig = {
			htmlUrl: pagesRes.data.html_url,
			status: pagesRes.data.status,
		}
	} catch (caught) {
		if (caught instanceof GitHubApiError && caught.status === 404) {
			return { build: null, pagesConfig: null, rateLimit }
		}
	}

	try {
		const buildRes = await githubFetch<GitHubPagesBuildResponse>(
			token,
			`${encodeRepoPath(repo)}/pages/builds/latest`,
		)
		rateLimit = buildRes.rateLimit ?? rateLimit
		build = buildRes.data
	} catch {
		// builds/latest might return 404 or fail if using Actions deployment workflows
	}

	return { build, pagesConfig, rateLimit }
}

export async function getWorkflowRuns(
	token: string,
	repo: DevStudioRepoRef,
	options?: { event?: string; perPage?: number },
): Promise<{
	runs: GitHubWorkflowRunResponse[]
	rateLimit: GitHubRateLimit | null
}> {
	const params = new URLSearchParams()
	params.set('per_page', String(options?.perPage ?? 10))
	if (options?.event) {
		params.set('event', options.event)
	}

	try {
		const result = await githubFetch<{
			workflow_runs: GitHubWorkflowRunResponse[]
		}>(
			token,
			`${encodeRepoPath(repo)}/actions/runs?${params.toString()}`,
		)
		return {
			runs: result.data.workflow_runs || [],
			rateLimit: result.rateLimit,
		}
	} catch {
		return { runs: [], rateLimit: null }
	}
}

export async function getPagesDeploymentStatus(
	token: string,
	repo: DevStudioRepoRef,
): Promise<{
	deployment: GitHubPagesDeploymentInfo | null
	rateLimit: GitHubRateLimit | null
}> {
	let rateLimit: GitHubRateLimit | null = null

	// 1. Fetch GitHub Pages site settings
	let pagesHtmlUrl: string | undefined
	let pagesStatus: string | undefined

	try {
		const pagesRes = await githubFetch<{ html_url?: string; status?: string }>(
			token,
			`${encodeRepoPath(repo)}/pages`,
		)
		rateLimit = pagesRes.rateLimit ?? rateLimit
		pagesHtmlUrl = pagesRes.data.html_url
		pagesStatus = pagesRes.data.status
	} catch (caught) {
		if (caught instanceof GitHubApiError && caught.status === 404) {
			return { deployment: null, rateLimit }
		}
	}

	const fallbackHtmlUrl = pagesHtmlUrl || `https://${repo.owner}.github.io/${repo.repo}/`

	// 2. Query GitHub Actions workflow runs (e.g. pages-build-deployment or recent runs)
	const actionsRes = await getWorkflowRuns(token, repo, { perPage: 10 })
	rateLimit = actionsRes.rateLimit ?? rateLimit

	const pageWorkflowRun =
		actionsRes.runs.find(
			(run) =>
				run.name.toLowerCase().includes('pages') ||
				run.name.toLowerCase().includes('deploy') ||
				run.head_branch === repo.branch,
		) || actionsRes.runs[0]

	if (pageWorkflowRun) {
		if (
			pageWorkflowRun.status === 'queued' ||
			pageWorkflowRun.status === 'in_progress' ||
			pageWorkflowRun.status === 'waiting'
		) {
			return {
				deployment: {
					state: 'building',
					statusText: 'Building...',
					htmlUrl: fallbackHtmlUrl,
					logsUrl: pageWorkflowRun.html_url,
					updatedAt: pageWorkflowRun.updated_at,
					commitSha: pageWorkflowRun.head_sha,
				},
				rateLimit,
			}
		}

		if (pageWorkflowRun.status === 'completed') {
			if (pageWorkflowRun.conclusion === 'success') {
				return {
					deployment: {
						state: 'deployed',
						statusText: 'Deployed',
						htmlUrl: fallbackHtmlUrl,
						logsUrl: pageWorkflowRun.html_url,
						updatedAt: pageWorkflowRun.updated_at,
						commitSha: pageWorkflowRun.head_sha,
					},
					rateLimit,
				}
			}

			if (
				pageWorkflowRun.conclusion === 'failure' ||
				pageWorkflowRun.conclusion === 'cancelled' ||
				pageWorkflowRun.conclusion === 'timed_out'
			) {
				return {
					deployment: {
						state: 'failed',
						statusText: 'Build Failed',
						htmlUrl: fallbackHtmlUrl,
						logsUrl: pageWorkflowRun.html_url,
						updatedAt: pageWorkflowRun.updated_at,
						commitSha: pageWorkflowRun.head_sha,
					},
					rateLimit,
				}
			}
		}
	}

	// 3. Fallback to /pages/builds/latest
	try {
		const buildRes = await githubFetch<GitHubPagesBuildResponse>(
			token,
			`${encodeRepoPath(repo)}/pages/builds/latest`,
		)
		rateLimit = buildRes.rateLimit ?? rateLimit
		const build = buildRes.data

		if (build.status === 'building' || build.status === 'queued') {
			return {
				deployment: {
					state: 'building',
					statusText: 'Building...',
					htmlUrl: fallbackHtmlUrl,
					logsUrl: build.html_url,
					updatedAt: build.updated_at,
					commitSha: build.commit,
				},
				rateLimit,
			}
		}

		if (build.status === 'errored') {
			return {
				deployment: {
					state: 'failed',
					statusText: 'Build Failed',
					htmlUrl: fallbackHtmlUrl,
					logsUrl: build.html_url,
					updatedAt: build.updated_at,
					commitSha: build.commit,
				},
				rateLimit,
			}
		}

		if (build.status === 'built') {
			return {
				deployment: {
					state: 'deployed',
					statusText: 'Deployed',
					htmlUrl: fallbackHtmlUrl,
					logsUrl: build.html_url,
					updatedAt: build.updated_at,
					commitSha: build.commit,
				},
				rateLimit,
			}
		}
	} catch {
		// Ignore API error for builds endpoint
	}

	// 4. Fallback based on /pages configuration status
	if (pagesStatus === 'building') {
		return {
			deployment: {
				state: 'building',
				statusText: 'Building...',
				htmlUrl: fallbackHtmlUrl,
			},
			rateLimit,
		}
	}

	if (pagesStatus === 'errored') {
		return {
			deployment: {
				state: 'failed',
				statusText: 'Build Failed',
				htmlUrl: fallbackHtmlUrl,
			},
			rateLimit,
		}
	}

	return {
		deployment: {
			state: 'deployed',
			statusText: 'Deployed',
			htmlUrl: fallbackHtmlUrl,
		},
		rateLimit,
	}
}
