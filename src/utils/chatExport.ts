import { MAIN_CONVERSATION_ID } from '@/services/gemini/constants'
import type { ConversationRecord, MessageMedia, StoredMessage } from '@/storage/types'
import { buildDownloadFilename } from '@/utils/downloads'

export const CHAT_EXPORT_VERSION = 2

export interface ChatExportMediaAsset {
	type: MessageMedia['type']
	mimeType: string
	dataUrl: string
}

export interface ChatExportMediaRef {
	type: MessageMedia['type']
	mimeType: string
	mediaId: string
}

export interface ChatExportMessage extends Omit<StoredMessage, 'media'> {
	media?: ChatExportMediaRef[]
}

export interface ChatExportConversation
	extends Omit<ConversationRecord, 'messages'> {
	messages: ChatExportMessage[]
}

export interface ChatExportFile {
	version: number
	exportedAt: number
	media?: Record<string, ChatExportMediaAsset>
	conversation: ChatExportConversation
}

function isStoredMessage(value: unknown): value is StoredMessage {
	if (!value || typeof value !== 'object') {
		return false
	}

	const message = value as StoredMessage
	return (
		typeof message.id === 'string' &&
		(message.role === 'user' || message.role === 'assistant') &&
		typeof message.content === 'string' &&
		typeof message.createdAt === 'number'
	)
}

function isMessageMedia(value: unknown): value is MessageMedia {
	if (!value || typeof value !== 'object') {
		return false
	}

	const media = value as MessageMedia
	return (
		(media.type === 'image' || media.type === 'audio') &&
		typeof media.mimeType === 'string' &&
		typeof media.dataUrl === 'string'
	)
}

function isChatExportMediaRef(value: unknown): value is ChatExportMediaRef {
	if (!value || typeof value !== 'object') {
		return false
	}

	const ref = value as ChatExportMediaRef
	return (
		(ref.type === 'image' || ref.type === 'audio') &&
		typeof ref.mimeType === 'string' &&
		typeof ref.mediaId === 'string'
	)
}

function isChatExportMessage(value: unknown): value is ChatExportMessage {
	if (!isStoredMessage(value)) {
		return false
	}

	const message = value as ChatExportMessage
	if (message.media === undefined) {
		return true
	}

	if (!Array.isArray(message.media)) {
		return false
	}

	return message.media.every(isChatExportMediaRef)
}

function isChatExportConversation(value: unknown): value is ChatExportConversation {
	if (!value || typeof value !== 'object') {
		return false
	}

	const conversation = value as ChatExportConversation
	return (
		typeof conversation.id === 'string' &&
		typeof conversation.title === 'string' &&
		typeof conversation.modelId === 'string' &&
		Array.isArray(conversation.messages) &&
		conversation.messages.every(isChatExportMessage) &&
		typeof conversation.createdAt === 'number' &&
		typeof conversation.updatedAt === 'number'
	)
}

function isConversationRecord(value: unknown): value is ConversationRecord {
	if (!value || typeof value !== 'object') {
		return false
	}

	const conversation = value as ConversationRecord
	return (
		typeof conversation.id === 'string' &&
		typeof conversation.title === 'string' &&
		typeof conversation.modelId === 'string' &&
		Array.isArray(conversation.messages) &&
		conversation.messages.every(isStoredMessage) &&
		typeof conversation.createdAt === 'number' &&
		typeof conversation.updatedAt === 'number'
	)
}

function isLegacyExportFile(
	payload: Partial<ChatExportFile>,
): payload is ChatExportFile & { conversation: ConversationRecord } {
	return (
		payload.version === 1 &&
		isConversationRecord(payload.conversation) &&
		payload.conversation.messages.some((message) =>
			message.media?.some((item) => isMessageMedia(item)),
		)
	)
}

function buildExportMedia(
	conversation: ConversationRecord,
): {
	media: Record<string, ChatExportMediaAsset>
	messages: ChatExportMessage[]
} {
	const media: Record<string, ChatExportMediaAsset> = {}
	const dataUrlToId = new Map<string, string>()

	const messages = conversation.messages.map((message) => {
		if (!message.media?.length) {
			return message as ChatExportMessage
		}

		const mediaRefs = message.media.map((item) => {
			let mediaId = dataUrlToId.get(item.dataUrl)
			if (!mediaId) {
				mediaId = crypto.randomUUID()
				dataUrlToId.set(item.dataUrl, mediaId)
				media[mediaId] = {
					type: item.type,
					mimeType: item.mimeType,
					dataUrl: item.dataUrl,
				}
			}

			return {
				type: item.type,
				mimeType: item.mimeType,
				mediaId,
			}
		})

		return {
			...message,
			media: mediaRefs,
		}
	})

	return { media, messages }
}

function rehydrateExportMessage(
	message: ChatExportMessage,
	media: Record<string, ChatExportMediaAsset>,
): StoredMessage {
	if (!message.media?.length) {
		const { media: _mediaRefs, ...rest } = message
		return rest
	}

	return {
		...message,
		media: message.media.map((ref) => {
			const asset = media[ref.mediaId]
			if (!asset) {
				throw new Error(
					`Invalid chat file: missing media asset "${ref.mediaId}".`,
				)
			}

			return {
				type: ref.type,
				mimeType: ref.mimeType || asset.mimeType,
				dataUrl: asset.dataUrl,
			}
		}),
	}
}

export function createChatExportFile(
	conversation: ConversationRecord,
): ChatExportFile {
	const { media, messages } = buildExportMedia(conversation)

	return {
		version: CHAT_EXPORT_VERSION,
		exportedAt: Date.now(),
		media: Object.keys(media).length > 0 ? media : undefined,
		conversation: {
			...conversation,
			messages,
		},
	}
}

export function parseChatImportFile(raw: unknown): ConversationRecord {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Invalid chat file: expected a JSON object.')
	}

	const payload = raw as Partial<ChatExportFile> & Partial<ConversationRecord>

	if (isLegacyExportFile(payload)) {
		return normalizeImportedConversation(payload.conversation)
	}

	if (payload.conversation && isChatExportConversation(payload.conversation)) {
		const media = payload.media ?? {}
		const messages = payload.conversation.messages.map((message) =>
			rehydrateExportMessage(message, media),
		)

		return normalizeImportedConversation({
			...payload.conversation,
			messages,
		})
	}

	if (isConversationRecord(payload.conversation)) {
		return normalizeImportedConversation(payload.conversation)
	}

	if (isConversationRecord(payload)) {
		return normalizeImportedConversation(payload)
	}

	throw new Error('Invalid chat file: missing a conversation export.')
}

function normalizeImportedConversation(
	conversation: ConversationRecord,
): ConversationRecord {
	return {
		...conversation,
		id: MAIN_CONVERSATION_ID,
		memoryArchiveCursor:
			typeof conversation.memoryArchiveCursor === 'number' &&
			conversation.memoryArchiveCursor >= 0
				? conversation.memoryArchiveCursor
				: 0,
		updatedAt: Date.now(),
	}
}

export function downloadChatExport(conversation: ConversationRecord): void {
	const exportFile = createChatExportFile(conversation)
	const blob = new Blob([JSON.stringify(exportFile, null, 2)], {
		type: 'application/json;charset=utf-8',
	})
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = buildDownloadFilename(
		'chat-export',
		'json',
		conversation.updatedAt,
	)
	anchor.click()
	URL.revokeObjectURL(url)
}
