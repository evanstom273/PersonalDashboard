import type { UserPreferences } from '@/storage/types'

export function getDevStudioAgentApiKey(
	preferences: UserPreferences,
	_modelId: string,
): string | null {
	const key = preferences.geminiApiKey.trim()
	return key || null
}

export function getDevStudioAgentApiKeyMessage(_modelId: string): string {
	return 'Add your Gemini API key in Settings before using Dev Studio.'
}
