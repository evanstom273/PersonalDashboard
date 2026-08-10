export type StoreName =
	| 'preferences'
	| 'conversations'
	| 'cache'
	| 'documents'
	| 'libraryMedia'
	| 'memories'

export type MemoryCategory =
	| 'preference'
	| 'fact'
	| 'project'
	| 'decision'
	| 'other'

export interface MemoryEntry {
	id: string
	content: string
	category: MemoryCategory
	archivedFromMessageCount: number
	createdAt: number
}

export const MEMORY_ARCHIVE_INTERVAL_OPTIONS = [5, 10, 15, 20] as const

export type MemoryArchiveInterval =
	(typeof MEMORY_ARCHIVE_INTERVAL_OPTIONS)[number]

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
	memoryArchiveInterval: MemoryArchiveInterval
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
	memoryArchiveInterval: 20,
}

export interface DocumentRecord {
	id: string
	title: string
	content: string
	source: DocumentSource
	contentFormat: DocumentContentFormat
	readOnly: boolean
	createdAt: number
	updatedAt: number
}

export type DocumentSource = 'upload' | 'user' | 'assistant'

export type DocumentContentFormat = 'markdown' | 'html'

export interface ConversationRecord {
	id: string
	title: string
	modelId: string
	messages: StoredMessage[]
	memoryArchiveCursor: number
	createdAt: number
	updatedAt: number
}

export interface StoredMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	media?: MessageMedia[]
	documentLinks?: MessageDocumentLink[]
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

export type MessageDocumentLinkAction = 'created' | 'updated'

export interface MessageDocumentLink {
	id: string
	title: string
	action: MessageDocumentLinkAction
}
