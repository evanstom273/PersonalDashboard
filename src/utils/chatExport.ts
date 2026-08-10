import { MAIN_CONVERSATION_ID } from '@/services/gemini/constants'
import type { ConversationRecord, StoredMessage } from '@/storage/types'
import { buildDownloadFilename } from '@/utils/downloads'

export const CHAT_EXPORT_VERSION = 1

export interface ChatExportFile {
	version: number
	exportedAt: number
	conversation: ConversationRecord
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

export function createChatExportFile(
	conversation: ConversationRecord,
): ChatExportFile {
	return {
		version: CHAT_EXPORT_VERSION,
		exportedAt: Date.now(),
		conversation,
	}
}

export function parseChatImportFile(raw: unknown): ConversationRecord {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Invalid chat file: expected a JSON object.')
	}

	const payload = raw as Partial<ChatExportFile> & Partial<ConversationRecord>

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
