import { useCallback, useEffect, useState } from 'react'
import {
	deleteValue,
	getAllValues,
	getValue,
	setValue,
} from '@/storage/storageService'
import {
	DEFAULT_PREFERENCES,
	type ConversationRecord,
	type StoredMessage,
	type UserPreferences,
} from '@/storage/types'

const PREFERENCES_KEY = 'user'
const CONVERSATION_INDEX_KEY = 'index'

function createConversation(modelId: string): ConversationRecord {
	const now = Date.now()
	return {
		id: crypto.randomUUID(),
		title: 'New chat',
		modelId,
		messages: [],
		createdAt: now,
		updatedAt: now,
	}
}

function deriveTitle(messages: StoredMessage[]): string {
	const firstUser = messages.find((message) => message.role === 'user')
	if (!firstUser) {
		return 'New chat'
	}
	return firstUser.content.slice(0, 48) || 'New chat'
}

export function usePreferences() {
	const [preferences, setPreferencesState] =
		useState<UserPreferences>(DEFAULT_PREFERENCES)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			const stored = await getValue<UserPreferences>(
				'preferences',
				PREFERENCES_KEY,
			)
			if (!cancelled) {
				setPreferencesState(stored ?? DEFAULT_PREFERENCES)
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [])

	const savePreferences = useCallback(
		async (next: UserPreferences): Promise<void> => {
			setPreferencesState(next)
			await setValue('preferences', PREFERENCES_KEY, next)
		},
		[],
	)

	return {
		preferences,
		savePreferences,
		isLoading,
	}
}

export function useConversations() {
	const [conversations, setConversations] = useState<ConversationRecord[]>([])
	const [activeConversationId, setActiveConversationId] = useState<string | null>(
		null,
	)
	const [isLoading, setIsLoading] = useState(true)

	const refreshConversations = useCallback(async (): Promise<void> => {
		const records = await getAllValues<ConversationRecord>('conversations')
		const sorted = records.sort((a, b) => b.updatedAt - a.updatedAt)
		setConversations(sorted)
	}, [])

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			const records = await getAllValues<ConversationRecord>('conversations')
			const sorted = records.sort((a, b) => b.updatedAt - a.updatedAt)
			const index = await getValue<string>('preferences', CONVERSATION_INDEX_KEY)

			if (!cancelled) {
				setConversations(sorted)
				setActiveConversationId(
					index && sorted.some((item) => item.id === index)
						? index
						: sorted[0]?.id ?? null,
				)
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [])

	const persistConversation = useCallback(
		async (conversation: ConversationRecord): Promise<void> => {
			await setValue('conversations', conversation.id, conversation)
			await refreshConversations()
		},
		[refreshConversations],
	)

	const selectConversation = useCallback(async (id: string): Promise<void> => {
		setActiveConversationId(id)
		await setValue('preferences', CONVERSATION_INDEX_KEY, id)
	}, [])

	const startConversation = useCallback(
		async (modelId: string): Promise<ConversationRecord> => {
			const conversation = createConversation(modelId)
			await persistConversation(conversation)
			await selectConversation(conversation.id)
			return conversation
		},
		[persistConversation, selectConversation],
	)

	const deleteConversation = useCallback(
		async (id: string): Promise<void> => {
			await deleteValue('conversations', id)
			await refreshConversations()
			setActiveConversationId((current) => (current === id ? null : current))
		},
		[refreshConversations],
	)

	const appendMessages = useCallback(
		async (
			conversationId: string,
			newMessages: StoredMessage[],
			modelId?: string,
		): Promise<ConversationRecord | null> => {
			const existing = await getValue<ConversationRecord>(
				'conversations',
				conversationId,
			)
			if (!existing) {
				return null
			}

			const messages = [...existing.messages, ...newMessages]
			const updated: ConversationRecord = {
				...existing,
				modelId: modelId ?? existing.modelId,
				messages,
				title: deriveTitle(messages),
				updatedAt: Date.now(),
			}

			await persistConversation(updated)
			return updated
		},
		[persistConversation],
	)

	const updateConversationModel = useCallback(
		async (conversationId: string, modelId: string): Promise<void> => {
			const existing = await getValue<ConversationRecord>(
				'conversations',
				conversationId,
			)
			if (!existing) {
				return
			}

			await persistConversation({
				...existing,
				modelId,
				updatedAt: Date.now(),
			})
		},
		[persistConversation],
	)

	const activeConversation =
		conversations.find((item) => item.id === activeConversationId) ?? null

	return {
		conversations,
		activeConversation,
		activeConversationId,
		isLoading,
		selectConversation,
		startConversation,
		deleteConversation,
		appendMessages,
		updateConversationModel,
	}
}
