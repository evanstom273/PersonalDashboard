import type { GitHubRateLimit } from '@/services/github/githubApiService'

export function formatRateLimitLabel(rateLimit: GitHubRateLimit): string {
	const resetLabel = new Date(rateLimit.resetAt).toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit',
	})

	return `${rateLimit.remaining} left · resets ${resetLabel}`
}
