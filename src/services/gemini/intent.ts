import {
	GENERATION_MODEL_IDS,
	type GenerationIntent,
} from '@/services/gemini/constants'

export interface ResolvedPrompt {
	modelId: string
	prompt: string
	intent: 'chat' | GenerationIntent
}

const INTENT_PATTERNS: Array<{
	intent: GenerationIntent
	regex: RegExp
}> = [
	{
		intent: 'image',
		regex: /^generate\s+image(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'music',
		regex: /^generate\s+music(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'video',
		regex: /^generate\s+video(?:[:\s,-]+([\s\S]*))?$/i,
	},
]

export function resolvePromptIntent(
	text: string,
	selectedChatModelId: string,
): ResolvedPrompt {
	const trimmed = text.trim()

	for (const { intent, regex } of INTENT_PATTERNS) {
		const match = trimmed.match(regex)
		if (match) {
			const detail = match[1]?.trim()
			return {
				intent,
				modelId: GENERATION_MODEL_IDS[intent],
				prompt: detail || trimmed,
			}
		}
	}

	return {
		intent: 'chat',
		modelId: selectedChatModelId,
		prompt: trimmed,
	}
}

export function getIntentLabel(intent: ResolvedPrompt['intent']): string {
	switch (intent) {
		case 'chat':
			return 'Chat'
		case 'image':
			return 'Image generation'
		case 'music':
			return 'Music generation'
		case 'video':
			return 'Video generation'
	}
}
