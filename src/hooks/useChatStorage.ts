import { useCallback, useEffect, useState } from 'react'
import { MAIN_CONVERSATION_ID } from '@/services/gemini/constants'
import { getValue, setValue } from '@/storage/storageService'
import {
	DEFAULT_PREFERENCES,
	type ConversationRecord,
	type StoredMessage,
	type UserPreferences,
} from '@/storage/types'

const PREFERENCES_KEY = 'user'

function createMainConversation(modelId: string): ConversationRecord {
	const now = Date.now()
	return {
		id: MAIN_CONVERSATION_ID,
		title: 'Chat',
		modelId,
		messages: [],
		createdAt: now,
		updatedAt: now,
	}
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
				setPreferencesState({
					...DEFAULT_PREFERENCES,
					...stored,
				})
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

export function useMainConversation(defaultModelId: string) {
	const [conversation, setConversation] = useState<ConversationRecord | null>(
		null,
	)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			const stored = await getValue<ConversationRecord>(
				'conversations',
				MAIN_CONVERSATION_ID,
			)

			if (!cancelled) {
				setConversation(stored ?? createMainConversation(defaultModelId))
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [defaultModelId])

	const persistConversation = useCallback(
		async (next: ConversationRecord): Promise<void> => {
			setConversation(next)
			await setValue('conversations', MAIN_CONVERSATION_ID, next)
		},
		[],
	)

	const ensureConversation = useCallback(async (): Promise<ConversationRecord> => {
		const stored = await getValue<ConversationRecord>(
			'conversations',
			MAIN_CONVERSATION_ID,
		)
		if (stored) {
			setConversation(stored)
			return stored
		}

		const created = createMainConversation(defaultModelId)
		await persistConversation(created)
		return created
	}, [defaultModelId, persistConversation])

	const appendMessages = useCallback(
		async (
			newMessages: StoredMessage[],
			modelId?: string,
		): Promise<ConversationRecord> => {
			const existing =
				(await getValue<ConversationRecord>(
					'conversations',
					MAIN_CONVERSATION_ID,
				)) ?? (await ensureConversation())

			const updated: ConversationRecord = {
				...existing,
				modelId: modelId ?? existing.modelId,
				messages: [...existing.messages, ...newMessages],
				updatedAt: Date.now(),
			}
			await persistConversation(updated)
			return updated
		},
		[ensureConversation, persistConversation],
	)

	const updateMessage = useCallback(
		async (
			messageId: string,
			patch: Partial<StoredMessage>,
		): Promise<ConversationRecord> => {
			const existing =
				(await getValue<ConversationRecord>(
					'conversations',
					MAIN_CONVERSATION_ID,
				)) ?? (await ensureConversation())

			const updated: ConversationRecord = {
				...existing,
				messages: existing.messages.map((message) =>
					message.id === messageId ? { ...message, ...patch } : message,
				),
				updatedAt: Date.now(),
			}
			await persistConversation(updated)
			return updated
		},
		[ensureConversation, persistConversation],
	)

	const clearConversation = useCallback(async (): Promise<ConversationRecord> => {
		const existing =
			(await getValue<ConversationRecord>(
				'conversations',
				MAIN_CONVERSATION_ID,
			)) ?? (await ensureConversation())

		const cleared: ConversationRecord = {
			...existing,
			messages: [],
			updatedAt: Date.now(),
		}
		await persistConversation(cleared)
		return cleared
	}, [ensureConversation, persistConversation])

	const replaceConversation = useCallback(
		async (next: ConversationRecord): Promise<ConversationRecord> => {
			const replaced: ConversationRecord = {
				...next,
				id: MAIN_CONVERSATION_ID,
				updatedAt: Date.now(),
			}
			await persistConversation(replaced)
			return replaced
		},
		[persistConversation],
	)

	return {
		conversation,
		isLoading,
		appendMessages,
		updateMessage,
		ensureConversation,
		clearConversation,
		replaceConversation,
	}
}
