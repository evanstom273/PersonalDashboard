import type { ChatInputMethod } from '@/storage/types'

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
	attachments: ChatAttachment[]
	webSearchEnabled: boolean
	inputMethod: ChatInputMethod
}

export type { ChatInputMethod }
