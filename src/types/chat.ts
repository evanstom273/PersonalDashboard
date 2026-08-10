import type { GenerationIntent } from '@/services/gemini/constants'

export type GenerationMode = 'auto' | 'chat' | GenerationIntent

export interface ChatAttachment {
	id: string
	type: 'document' | 'image'
	name: string
	documentId?: string
	dataUrl?: string
	mimeType?: string
}

export interface ChatSubmitPayload {
	text: string
	generationMode: GenerationMode
	attachments: ChatAttachment[]
}

export const GENERATION_MODE_LABELS: Record<GenerationMode, string> = {
	auto: 'Auto',
	chat: 'Chat',
	image: 'Image',
	music: 'Music',
	video: 'Video',
}
