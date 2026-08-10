export type StoreName =
	| 'preferences'
	| 'conversations'
	| 'cache'

export interface UserPreferences {
	geminiApiKey: string
	defaultModelId: string
}

export const DEFAULT_PREFERENCES: UserPreferences = {
	geminiApiKey: '',
	defaultModelId: 'gemini-3.6-flash',
}

export interface ConversationRecord {
	id: string
	title: string
	modelId: string
	messages: StoredMessage[]
	createdAt: number
	updatedAt: number
}

export interface StoredMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	media?: MessageMedia[]
	createdAt: number
}

export interface MessageMedia {
	type: 'image' | 'audio' | 'video'
	mimeType: string
	dataUrl: string
}
