export type StoreName =
	| 'preferences'
	| 'conversations'
	| 'cache'
	| 'documents'
	| 'libraryMedia'

export type LibraryMediaKind = 'image' | 'audio' | 'video'

export interface LibraryMediaRecord {
	id: string
	title: string
	kind: LibraryMediaKind
	mimeType: string
	dataUrl: string
	source: 'upload' | 'generated'
	prompt?: string
	createdAt: number
	updatedAt: number
}

export interface UserPreferences {
	geminiApiKey: string
	defaultModelId: string
	defaultImageModelId: string
	defaultMusicModelId: string
	defaultVideoModelId: string
	userName: string
	aiName: string
	aiBehaviorInstructions: string
}

export const DEFAULT_PREFERENCES: UserPreferences = {
	geminiApiKey: '',
	defaultModelId: 'gemini-3.6-flash',
	defaultImageModelId: 'gemini-3.1-flash-image',
	defaultMusicModelId: 'lyria-3-pro-preview',
	defaultVideoModelId: 'veo-3.1-lite-generate-preview',
	userName: '',
	aiName: '',
	aiBehaviorInstructions: '',
}

export interface DocumentRecord {
	id: string
	title: string
	content: string
	createdAt: number
	updatedAt: number
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
	pendingDeleteConfirmation?: PendingDeleteConfirmation
	createdAt: number
}

export interface PendingDeleteConfirmation {
	documentId: string
	documentTitle: string
}

export interface MessageMedia {
	type: 'image' | 'audio' | 'video'
	mimeType: string
	dataUrl: string
}
