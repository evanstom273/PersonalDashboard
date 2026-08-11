import { useCallback, useEffect, useState } from 'react'
import {
	listAccessibleRepositories,
	type GitHubRepositorySummary,
} from '@/services/github/githubApiService'

export function useGitHubRepositories(githubPat: string) {
	const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasLoaded, setHasLoaded] = useState(false)

	const loadRepositories = useCallback(async () => {
		const token = githubPat.trim()
		if (!token) {
			setError('GitHub token required.')
			setRepositories([])
			setHasLoaded(false)
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const result = await listAccessibleRepositories(token)
			setRepositories(result.repositories)
			setHasLoaded(true)

			if (result.repositories.length === 0) {
				setError('No repositories found for this token.')
			}
		} catch (caught) {
			setRepositories([])
			setHasLoaded(false)
			setError(
				caught instanceof Error
					? caught.message
					: 'Could not load repositories.',
			)
		} finally {
			setIsLoading(false)
		}
	}, [githubPat])

	useEffect(() => {
		setRepositories([])
		setHasLoaded(false)
		setError(null)
	}, [githubPat])

	return {
		repositories,
		isLoading,
		error,
		hasLoaded,
		loadRepositories,
	}
}

export function findRepositoryBranch(
	repositories: GitHubRepositorySummary[],
	fullName: string,
): string | undefined {
	return repositories.find((repo) => repo.fullName === fullName)?.defaultBranch
}
