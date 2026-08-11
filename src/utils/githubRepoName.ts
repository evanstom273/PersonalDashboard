const REPO_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/

export function normalizeRepositoryName(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9._-]/g, '')
}

export function isValidRepositoryName(name: string): boolean {
	const trimmed = name.trim()
	return (
		trimmed.length > 0 &&
		trimmed.length <= 100 &&
		REPO_NAME_PATTERN.test(trimmed)
	)
}

export function getRepositoryNameError(name: string): string | null {
	const trimmed = name.trim()
	if (!trimmed) {
		return 'Repository name is required.'
	}
	if (trimmed.length > 100) {
		return 'Repository name must be 100 characters or fewer.'
	}
	if (!REPO_NAME_PATTERN.test(trimmed)) {
		return 'Use letters, numbers, hyphens, underscores, or periods only.'
	}
	return null
}
