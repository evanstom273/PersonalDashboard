import { useCallback, useEffect, useRef, useState } from 'react'
import { generateChatWithTools } from '@/services/gemini/chatWithTools'
import type { GenerationIntent } from '@/services/gemini/constants'
import { enrichImagePromptWithUserContext } from '@/services/gemini/imagePromptContext'
import { getIntentLabel, resolvePromptIntent } from '@/services/gemini/intent'
import { getGenerationModelPreferences } from '@/services/gemini/modelPreferences'
import { getModelById } from '@/services/gemini/models'
import { runModelGeneration } from '@/services/gemini'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import {
	queueMemoryArchive,
} from '@/services/memory/memoryArchive'
import { capUnarchivedMessagesForModel } from '@/utils/chatHistory'
import { saveMessageMediaToLibrary } from '@/services/library/libraryMediaService'
import type { ConversationRecord, StoredMessage, UserPreferences } from '@/storage/types'
import { getActiveGeminiApiKey, hasGeminiApiKey } from '@/storage/geminiApiKeys'
import type { ChatInputMethod, ChatSubmitPayload } from '@/types/chat'
import {
	notifyGenerationComplete,
	requestNotificationPermission,
} from '@/utils/notifications'

interface UseChatGenerationOptions {
	preferences: UserPreferences
	conversation: ConversationRecord | null
	appendMessages: (
		newMessages: StoredMessage[],
		modelId?: string,
	) => Promise<ConversationRecord>
	truncateMessagesFrom: (messageId: string) => Promise<ConversationRecord>
	ensureConversation: () => Promise<ConversationRecord>
	saveConversation: (next: ConversationRecord) => Promise<void>
	isChatRoute: boolean
	onAssistantReply?: (payload: {
		message: StoredMessage
		inputMethod: ChatInputMethod
	}) => void
	onMemoryArchiveError?: (error: Error) => void
}

export function useChatGeneration({
	preferences,
	conversation,
	appendMessages,
	truncateMessagesFrom,
	ensureConversation,
	saveConversation,
	isChatRoute,
	onAssistantReply,
	onMemoryArchiveError,
}: UseChatGenerationOptions) {
	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastIntent, setLastIntent] = useState<string | null>(null)
	const [streamingAssistant, setStreamingAssistant] = useState<{
		id: string
		content: string
	} | null>(null)
	const [completionNotice, setCompletionNotice] = useState<string | null>(null)

	const streamingContentRef = useRef('')
	const abortControllerRef = useRef<AbortController | null>(null)
	const isChatRouteRef = useRef(isChatRoute)

	isChatRouteRef.current = isChatRoute

	useEffect(() => {
		if (isGenerating && !isChatRoute) {
			void requestNotificationPermission()
		}
	}, [isGenerating, isChatRoute])

	const clearCompletionNotice = useCallback(() => {
		setCompletionNotice(null)
	}, [])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const stopGeneration = useCallback(() => {
		abortControllerRef.current?.abort()
		setIsGenerating(false)
	}, [])

	const submitMessage = useCallback(
		async (
			{
				text,
				attachments,
				webSearchEnabled: useWebSearch,
				editFromMessageId,
				inputMethod,
			}: ChatSubmitPayload,
			options?: { forcedNextIntent?: GenerationIntent | null },
		) => {
			const hasApiKey = hasGeminiApiKey(preferences)
			if (!hasApiKey) {
				setError('Add your Gemini API key in Settings before generating.')
				return
			}

			setError(null)
			setCompletionNotice(null)
			setIsGenerating(true)
			setStreamingAssistant(null)
			streamingContentRef.current = ''

			const abortController = new AbortController()
			abortControllerRef.current = abortController

			const modelPreferences = getGenerationModelPreferences(preferences)
			const activeForcedIntent = options?.forcedNextIntent ?? null

			let activeConversation = conversation
			if (editFromMessageId) {
				activeConversation = await truncateMessagesFrom(editFromMessageId)
			}

			const recentMessages = (activeConversation?.messages ?? [])
				.slice(-8)
				.map((message) => ({
					role: message.role,
					content: message.content,
					mediaTypes: message.media
						?.map((item) => item.type)
						.filter((type): type is 'image' | 'audio' =>
							type === 'image' || type === 'audio',
						),
				}))

			const resolved = resolvePromptIntent(
				text,
				modelPreferences,
				activeForcedIntent,
				recentMessages,
			)

			if (resolved.intent !== 'chat' && !text.trim()) {
				setError('Add a prompt for image or music generation.')
				setIsGenerating(false)
				return
			}

			setLastIntent(getIntentLabel(resolved.intent))

			const chatHistory = (
				activeConversation
					? capUnarchivedMessagesForModel(
							activeConversation.messages,
							activeConversation.memoryArchiveCursor ?? 0,
						)
					: []
			).map(
				(message) => ({
					role: message.role,
					content: message.content,
					createdAt: message.createdAt,
				}),
			)

			const imageAttachments = attachments
				.filter((attachment) => attachment.type === 'image' && attachment.dataUrl)
				.map((attachment) => ({
					type: 'image' as const,
					mimeType: attachment.mimeType ?? 'image/png',
					dataUrl: attachment.dataUrl!,
				}))

			const assistantMessageId = crypto.randomUUID()

			try {
				await ensureConversation()

				const userMessage: StoredMessage = {
					id: crypto.randomUUID(),
					role: 'user',
					content: text,
					media: imageAttachments.length > 0 ? imageAttachments : undefined,
					createdAt: Date.now(),
				}
				await appendMessages([userMessage], preferences.defaultModelId)

				if (imageAttachments.length > 0) {
					await saveMessageMediaToLibrary(imageAttachments, {
						source: 'upload',
						prompt: text,
					})
				}

				const history =
					resolved.intent === 'chat'
						? [
								...chatHistory,
								{
									role: 'user' as const,
									content: text,
									media: userMessage.media,
									createdAt: userMessage.createdAt,
								},
							]
						: []

				let assistantText = ''
				let assistantMedia: StoredMessage['media']
				let assistantDocumentLinks: StoredMessage['documentLinks']
				let pendingDeleteConfirmation: StoredMessage['pendingDeleteConfirmation']

				if (resolved.intent === 'chat') {
					streamingContentRef.current = ''
					setStreamingAssistant({ id: assistantMessageId, content: '' })

					const chatResult = await generateChatWithTools(
						getActiveGeminiApiKey(preferences),
						resolved.modelId,
						history,
						preferences,
						{
							useWebSearch: useWebSearch,
							signal: abortController.signal,
							onTextDelta: (delta) => {
								streamingContentRef.current += delta
								setStreamingAssistant((current) =>
									current
										? {
												...current,
												content: streamingContentRef.current,
											}
										: null,
								)
							},
							onToolActivity: () => {
								streamingContentRef.current = ''
								setStreamingAssistant((current) =>
									current ? { ...current, content: '' } : null,
								)
							},
						},
					)
					assistantText = chatResult.text
					assistantMedia =
						chatResult.media.length > 0 ? chatResult.media : undefined
					assistantDocumentLinks =
						chatResult.documentLinks.length > 0
							? chatResult.documentLinks
							: undefined
					pendingDeleteConfirmation = chatResult.pendingDeleteConfirmation
				} else {
					const generationPrompt =
						resolved.intent === 'image'
							? await enrichImagePromptWithUserContext(
									resolved.prompt,
									preferences,
									recentMessages,
								)
							: resolved.prompt

					const result = await runModelGeneration(
						getActiveGeminiApiKey(preferences),
						resolved.modelId,
						generationPrompt,
						history,
						preferences.allowMatureContent ?? true,
					)
					const modelUsed = getModelById(resolved.modelId)
					assistantMedia = result.media.length > 0 ? result.media : undefined
					const intentLabel = getIntentLabel(resolved.intent)

					if (assistantMedia?.length) {
						const trimmedText = result.text.trim()
						assistantText =
							trimmedText &&
							!/^generation completed\.?$/i.test(trimmedText) &&
							!/^generated (image|music):?\.?$/i.test(trimmedText)
								? trimmedText
								: `${intentLabel} generated with ${modelUsed?.name ?? resolved.modelId}.`
					} else {
						assistantText = `[${intentLabel} · ${modelUsed?.name ?? resolved.modelId}]\n${result.text}`
					}
				}

				const assistantMessage: StoredMessage = {
					id: assistantMessageId,
					role: 'assistant',
					content: assistantText,
					media: assistantMedia,
					documentLinks: assistantDocumentLinks,
					pendingDeleteConfirmation,
					createdAt: Date.now(),
				}

				const updatedConversation = await appendMessages(
					[assistantMessage],
					preferences.defaultModelId,
				)
				setStreamingAssistant(null)
				streamingContentRef.current = ''

				if (resolved.intent === 'chat') {
					queueMemoryArchive(
						getActiveGeminiApiKey(preferences),
						updatedConversation,
						preferences,
						saveConversation,
						onMemoryArchiveError,
					)
				}

				if (assistantMedia && assistantMedia.length > 0) {
					await saveMessageMediaToLibrary(assistantMedia, {
						source: 'generated',
						prompt: resolved.prompt,
					})
				}

				if (
					resolved.intent === 'chat' &&
					assistantText.trim() &&
					onAssistantReply
				) {
					onAssistantReply({
						message: assistantMessage,
						inputMethod,
					})
				}

				const aiName = getConfiguredAiName(preferences)
				if (!isChatRouteRef.current) {
					setCompletionNotice(`${aiName} finished replying.`)
				}

				void requestNotificationPermission().then(() => {
					void notifyGenerationComplete(aiName, assistantText, {
						isChatRoute: isChatRouteRef.current,
					})
				})
			} catch (generationError) {
				if (
					generationError instanceof DOMException &&
					generationError.name === 'AbortError'
				) {
					const partialContent = streamingContentRef.current.trim()
					if (partialContent) {
						await appendMessages([
							{
								id: assistantMessageId,
								role: 'assistant',
								content: partialContent,
								createdAt: Date.now(),
							},
						])
					}
					setStreamingAssistant(null)
					streamingContentRef.current = ''
					return
				}

				setError(
					generationError instanceof Error
						? generationError.message
						: 'Generation failed',
				)
				setStreamingAssistant(null)
				streamingContentRef.current = ''

				if (!isChatRouteRef.current) {
					setCompletionNotice('Generation failed. Open chat to see details.')
				}
			} finally {
				abortControllerRef.current = null
				setIsGenerating(false)
			}
		},
		[
			appendMessages,
			conversation,
			ensureConversation,
			onAssistantReply,
			onMemoryArchiveError,
			preferences,
			saveConversation,
			truncateMessagesFrom,
		],
	)

	return {
		isGenerating,
		error,
		lastIntent,
		streamingAssistant,
		completionNotice,
		submitMessage,
		stopGeneration,
		clearCompletionNotice,
		clearError,
	}
}
