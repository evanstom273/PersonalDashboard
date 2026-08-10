export const MAIN_CONVERSATION_ID = 'main'

export const CHAT_MODEL_IDS = [
	'gemini-3.6-flash',
	'gemini-3.1-pro-preview',
] as const

export type ChatModelId = (typeof CHAT_MODEL_IDS)[number]

export const GENERATION_MODEL_IDS = {
	image: 'gemini-3.1-flash-image',
	music: 'lyria-3-pro-preview',
	video: 'veo-3.1-generate-preview',
} as const

export type GenerationIntent = keyof typeof GENERATION_MODEL_IDS
