export const MAIN_CONVERSATION_ID = 'main'

export const CHAT_MODEL_IDS = [
	'gemini-3.6-flash',
	'gemini-3.1-pro-preview',
] as const

export type ChatModelId = (typeof CHAT_MODEL_IDS)[number]

export type GenerationIntent = 'image' | 'music' | 'video'
