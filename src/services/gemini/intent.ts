import {
	GENERATION_MODEL_IDS,
	type GenerationIntent,
} from '@/services/gemini/constants'

export interface ResolvedPrompt {
	modelId: string
	prompt: string
	intent: 'chat' | GenerationIntent
}

interface IntentPattern {
	intent: GenerationIntent
	regex: RegExp
}

const INTENT_PATTERNS: IntentPattern[] = [
	// Image — explicit "generate image" phrasing (with optional "a/an")
	{
		intent: 'image',
		regex:
			/^generate\s+(?:an?\s+)?image\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'image',
		regex: /^generate\s+(?:an?\s+)?image(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'image',
		regex:
			/^generate\s+(?:a\s+)?picture\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'image',
		regex: /^generate\s+(?:a\s+)?picture(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'image',
		regex:
			/^(?:create|make|draw)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork)\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'image',
		regex:
			/^(?:create|make|draw)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork)(?:[:\s,-]+([\s\S]*))?$/i,
	},
	// Music
	{
		intent: 'music',
		regex:
			/^generate\s+(?:an?\s+)?(?:music|song|track)\s+(?:about|for|called)\s+([\s\S]+)$/i,
	},
	{
		intent: 'music',
		regex: /^generate\s+(?:an?\s+)?(?:music|song|track)(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'music',
		regex:
			/^(?:create|make|compose)\s+(?:me\s+)?(?:an?\s+)?(?:music|song|track)(?:[:\s,-]+([\s\S]*))?$/i,
	},
	// Video
	{
		intent: 'video',
		regex:
			/^generate\s+(?:an?\s+)?video\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'video',
		regex: /^generate\s+(?:an?\s+)?video(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'video',
		regex:
			/^(?:create|make)\s+(?:me\s+)?(?:an?\s+)?video(?:[:\s,-]+([\s\S]*))?$/i,
	},
]

function resolveGenerationPrompt(
	trimmed: string,
	detail: string | undefined,
): string {
	const normalizedDetail = detail?.trim()
	return normalizedDetail && normalizedDetail.length > 0 ? normalizedDetail : trimmed
}

export function resolvePromptIntent(
	text: string,
	selectedChatModelId: string,
): ResolvedPrompt {
	const trimmed = text.trim()

	for (const { intent, regex } of INTENT_PATTERNS) {
		const match = trimmed.match(regex)
		if (match) {
			return {
				intent,
				modelId: GENERATION_MODEL_IDS[intent],
				prompt: resolveGenerationPrompt(trimmed, match[1]),
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
