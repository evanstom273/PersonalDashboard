export const MAIN_CONVERSATION_ID = 'main'

export const CHAT_MODEL_IDS = [
	'gemini-3.6-flash',
	'gemini-3.1-pro-preview',
] as const

export type ChatModelId = (typeof CHAT_MODEL_IDS)[number]

export const IMAGE_MODEL_IDS = [
	'gemini-3-pro-image',
	'gemini-3.1-flash-image',
	'gemini-3.1-flash-lite-image',
] as const

export const MUSIC_MODEL_IDS = [
	'lyria-3-pro-preview',
	'lyria-3-clip-preview',
] as const

export const VIDEO_MODEL_IDS = [
	'veo-3.1-generate-preview',
	'veo-3.1-lite-generate-preview',
] as const

export const DEFAULT_IMAGE_MODEL_ID = 'gemini-3.1-flash-image'
export const DEFAULT_MUSIC_MODEL_ID = 'lyria-3-pro-preview'
export const DEFAULT_VIDEO_MODEL_ID = 'veo-3.1-lite-generate-preview'

export type GenerationIntent = 'image' | 'music' | 'video'
