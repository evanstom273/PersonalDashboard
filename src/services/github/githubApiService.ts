import type {
	DevStudioFileNode,
	DevStudioPullRequest,
	DevStudioRepoRef,
} from '@/types/devStudio'

const GITHUB_API = 'https://api.github.com'

export interface GitHubRateLimit {
	remaining: number
	limit: number
	resetAt: number
}

export class GitHubApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'GitHubApiError'
		this.status = status
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
): Promise<{ data: T; rateLimit: GitHubRateLimit | null }> {
	const response = await fetch(`${GITHUB_API}${path}`, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${token}`,
			'X-GitHub-Api-Version': '2022-11-28',
			...(init?.headers ?? {}),
		},
	})

	const rateLimit = parseRateLimit(response)

	if (!response.ok) {
		let message = `GitHub API error (${response.status})`
		try {
			const body = (await response.json()) as { message?: string }
			if (body.message) {
				message = body.message
			}
		} catch {
			// Ignore JSON parse failures.
		}
		throw new GitHubApiError(message, response.status)
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
