import {
	useChatUiContext,
	useMainConversationContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'
import { generateChatWithTools } from '@/services/gemini/chatWithTools'
import type { GenerationIntent } from '@/services/gemini/constants'
import { confirmDocumentDeletion } from '@/services/gemini/documentTools'
import { getIntentLabel, resolvePromptIntent } from '@/services/gemini/intent'
import { getGenerationModelPreferences } from '@/services/gemini/modelPreferences'
import { getModelById } from '@/services/gemini/models'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { queueMemoryArchive, getUnarchivedMessages } from '@/services/memory/memoryArchive'
import { runModelGeneration } from '@/services/gemini'
import { saveMessageMediaToLibrary } from '@/services/library/libraryMediaService'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { ChatSubmitPayload } from '@/types/chat'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatModelSelector } from '@/components/chat/ChatModelSelector'

export function ChatPage() {
	const { preferences, savePreferences } = usePreferencesContext()
	const {
		conversation,
		appendMessages,
		updateMessage,
		ensureConversation,
		clearConversation,
		replaceConversation,
		saveConversation,
	} = useMainConversationContext()
	const { setIsChatGenerating } = useChatUiContext()

	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastIntent, setLastIntent] = useState<string | null>(null)
	const [webSearchEnabled, setWebSearchEnabled] = useState(false)
	const [forcedNextIntent, setForcedNextIntent] =
		useState<GenerationIntent | null>(null)

	const aiName = getConfiguredAiName(preferences)
	const hasApiKey = preferences.geminiApiKey.trim().length > 0

	useEffect(() => {
		setIsChatGenerating(isGenerating)
	}, [isGenerating, setIsChatGenerating])

	const chatHistory = useMemo(
		() =>
			(conversation ? getUnarchivedMessages(conversation) : []).map((message) => ({
				role: message.role,
				content: message.content,
			})),
		[conversation],
	)

	const saveModelPreference = useCallback(
		async (patch: Partial<UserPreferences>) => {
			await savePreferences({
				...preferences,
				...patch,
			})
		},
		[preferences, savePreferences],
	)

	const handleClearChat = useCallback(async () => {
		await clearConversation()
		setLastIntent(null)
		setError(null)
		setForcedNextIntent(null)
	}, [clearConversation])

	const handleImportChat = useCallback(
		async (imported: Parameters<typeof replaceConversation>[0]) => {
			await replaceConversation(imported)
			setLastIntent(null)
			setError(null)
			setForcedNextIntent(null)
		},
		[replaceConversation],
	)

	const handleSubmit = useCallback(
		async ({ text, attachments, webSearchEnabled: useWebSearch }: ChatSubmitPayload) => {
			if (!hasApiKey) {
				setError('Add your Gemini API key in Settings before generating.')
				return
			}

			setError(null)
			setIsGenerating(true)

			const modelPreferences = getGenerationModelPreferences(preferences)
			const activeForcedIntent = forcedNextIntent
			const resolved = resolvePromptIntent(
				text,
				modelPreferences,
				activeForcedIntent,
			)

			if (activeForcedIntent) {
				setForcedNextIntent(null)
			}

			if (resolved.intent !== 'chat' && !text.trim()) {
				setError('Add a prompt for image, music, or video generation.')
				setIsGenerating(false)
				return
			}

			setLastIntent(getIntentLabel(resolved.intent))

			const imageAttachments = attachments
				.filter((attachment) => attachment.type === 'image' && attachment.dataUrl)
				.map((attachment) => ({
					type: 'image' as const,
					mimeType: attachment.mimeType ?? 'image/png',
					dataUrl: attachment.dataUrl!,
				}))

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
								},
							]
						: []

				let assistantText = ''
				let assistantMedia: StoredMessage['media']
				let pendingDeleteConfirmation: StoredMessage['pendingDeleteConfirmation']

				if (resolved.intent === 'chat') {
					const chatResult = await generateChatWithTools(
						preferences.geminiApiKey,
						resolved.modelId,
						history,
						preferences,
						{ useWebSearch: useWebSearch },
					)
					assistantText = chatResult.text
					assistantMedia =
						chatResult.media.length > 0 ? chatResult.media : undefined
					pendingDeleteConfirmation = chatResult.pendingDeleteConfirmation
				} else {
					const result = await runModelGeneration(
						preferences.geminiApiKey,
						resolved.modelId,
						resolved.prompt,
						history,
					)
					const modelUsed = getModelById(resolved.modelId)
					assistantText = `[${getIntentLabel(resolved.intent)} · ${modelUsed?.name ?? resolved.modelId}]\n${result.text}`
					assistantMedia = result.media.length > 0 ? result.media : undefined
				}

				const assistantMessage: StoredMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: assistantText,
					media: assistantMedia,
					pendingDeleteConfirmation,
					createdAt: Date.now(),
				}

				const updatedConversation = await appendMessages(
					[assistantMessage],
					preferences.defaultModelId,
				)

				if (resolved.intent === 'chat') {
					queueMemoryArchive(
						preferences.geminiApiKey,
						resolved.modelId,
						updatedConversation,
						preferences,
						saveConversation,
					)
				}

				if (assistantMedia && assistantMedia.length > 0) {
					await saveMessageMediaToLibrary(assistantMedia, {
						source: 'generated',
						prompt: resolved.prompt,
					})
				}
			} catch (generationError) {
				setError(
					generationError instanceof Error
						? generationError.message
						: 'Generation failed',
				)
			} finally {
				setIsGenerating(false)
			}
		},
		[
			appendMessages,
			chatHistory,
			ensureConversation,
			forcedNextIntent,
			hasApiKey,
			preferences,
			saveConversation,
		],
	)

	const handleConfirmDelete = useCallback(
		async (messageId: string, documentId: string, documentTitle: string) => {
			const deleted = await confirmDocumentDeletion(documentId)
			await updateMessage(messageId, { pendingDeleteConfirmation: undefined })
			if (deleted) {
				await appendMessages([
					{
						id: crypto.randomUUID(),
						role: 'assistant',
						content: `Deleted the document "${documentTitle}".`,
						createdAt: Date.now(),
					},
				])
			}
		},
		[appendMessages, updateMessage],
	)

	const handleCancelDelete = useCallback(
		async (messageId: string) => {
			await updateMessage(messageId, { pendingDeleteConfirmation: undefined })
			await appendMessages([
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: 'Document deletion was cancelled.',
					createdAt: Date.now(),
				},
			])
		},
		[appendMessages, updateMessage],
	)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="hidden shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:flex md:px-6">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">{aiName}</h1>
						<ChatConversationActions
							conversation={conversation}
							isGenerating={isGenerating}
							onClear={handleClearChat}
							onImport={handleImportChat}
						/>
					</div>
					<p className="text-xs text-muted-foreground">
						Try &quot;generate an image of…&quot;, &quot;generate music&quot;, or
						&quot;create a video&quot;
						{lastIntent ? ` · last: ${lastIntent}` : ''}
					</p>
				</div>
				<ChatModelSelector
					value={preferences.defaultModelId}
					onChange={(modelId) => {
						void saveModelPreference({ defaultModelId: modelId })
					}}
				/>
			</header>

			{!hasApiKey ? (
				<div className="shrink-0 border-b border-border bg-secondary/40 px-4 py-2 text-sm md:px-6">
					<span className="text-muted-foreground">
						No API key configured.{' '}
					</span>
					<Link
						to="/settings"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Add your Gemini API key
					</Link>
				</div>
			) : null}

			{error ? (
				<div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive md:px-6">
					{error}
				</div>
			) : null}

			<ChatMessages
				messages={conversation?.messages ?? []}
				isGenerating={isGenerating}
				aiName={aiName}
				onConfirmDelete={handleConfirmDelete}
				onCancelDelete={handleCancelDelete}
			/>

			<ChatInput
				disabled={!hasApiKey}
				isGenerating={isGenerating}
				webSearchEnabled={webSearchEnabled}
				selectedChatModelId={preferences.defaultModelId}
				selectedImageModelId={preferences.defaultImageModelId}
				selectedMusicModelId={preferences.defaultMusicModelId}
				selectedVideoModelId={preferences.defaultVideoModelId}
				forcedNextIntent={forcedNextIntent}
				onForceNextIntent={setForcedNextIntent}
				onWebSearchChange={setWebSearchEnabled}
				onChatModelChange={(modelId) => {
					void saveModelPreference({ defaultModelId: modelId })
				}}
				onImageModelChange={(modelId) => {
					void saveModelPreference({ defaultImageModelId: modelId })
				}}
				onMusicModelChange={(modelId) => {
					void saveModelPreference({ defaultMusicModelId: modelId })
				}}
				onVideoModelChange={(modelId) => {
					void saveModelPreference({ defaultVideoModelId: modelId })
				}}
				onSubmit={(payload) => {
					void handleSubmit(payload)
				}}
				onStop={() => setIsGenerating(false)}
			/>
		</div>
	)
}
