import type { GitHubRepositorySummary } from '@/services/github/githubApiService'

export function mergeRepositoryOptions(
	remote: GitHubRepositorySummary[],
	pinned: GitHubRepositorySummary[],
	activeSlug: string,
	activeBranch: string,
): GitHubRepositorySummary[] {
	const byName = new Map<string, GitHubRepositorySummary>()

	for (const repo of remote) {
		byName.set(repo.fullName, repo)
	}

	for (const repo of pinned) {
		byName.set(repo.fullName, repo)
	}

	if (activeSlug && !byName.has(activeSlug)) {
		byName.set(activeSlug, {
			fullName: activeSlug,
			defaultBranch: activeBranch || 'main',
			isPrivate: true,
			updatedAt: new Date().toISOString(),
		})
	}

	return Array.from(byName.values()).sort((a, b) =>
		a.fullName.localeCompare(b.fullName),
	)
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => window.setTimeout(resolve, ms))
}
