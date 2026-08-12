import {
	getDevStudioModelProvider,
	resolveDevStudioModelId,
} from '@/services/devStudio/devStudioModels'
import type { UserPreferences } from '@/storage/types'

export function getDevStudioAgentApiKey(
	preferences: UserPreferences,
	modelId: string,
): string | null {
	const provider = getDevStudioModelProvider(modelId)
	if (provider === 'openrouter') {
		const key = preferences.openRouterApiKey.trim()
		return key || null
	}

	const key = preferences.geminiApiKey.trim()
	return key || null
}

export function getDevStudioAgentApiKeyMessage(modelId: string): string {
	const resolvedId = resolveDevStudioModelId(modelId)
	if (getDevStudioModelProvider(resolvedId) === 'openrouter') {
		return 'Add your OpenRouter API key in Settings → App → Dev Studio to use Qwen 3.6 Plus (free preview).'
	}
	return 'Add your Gemini API key in Settings before chatting.'
}
