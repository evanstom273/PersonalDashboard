import { usePreferencesContext, useMainConversationContext } from '@/providers/ChatProvider'
import { generateChatWithTools } from '@/services/gemini/chatWithTools'
import { CHAT_MODEL_IDS, type ChatModelId } from '@/services/gemini/constants'
import { confirmDocumentDeletion } from '@/services/gemini/documentTools'
import { getIntentLabel, resolvePromptIntent } from '@/services/gemini/intent'
import { getModelById } from '@/services/gemini/models'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { runModelGeneration } from '@/services/gemini'
import { saveMessageMediaToLibrary } from '@/services/library/libraryMediaService'
import type { StoredMessage } from '@/storage/types'
import type { ChatSubmitPayload, GenerationMode } from '@/types/chat'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatModelSelector } from '@/components/chat/ChatModelSelector'

export function ChatPage() {
	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const { conversation, appendMessages, updateMessage, ensureConversation } =
		useMainConversationContext()

	const [selectedChatModelId, setSelectedChatModelId] = useState(
		preferences.defaultModelId,
	)
	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastIntent, setLastIntent] = useState<string | null>(null)
	const [generationMode, setGenerationMode] = useState<GenerationMode>('auto')

	const aiName = getConfiguredAiName(preferences)
	const selectedModel = getModelById(selectedChatModelId)
	const hasApiKey = preferences.geminiApiKey.trim().length > 0

	useEffect(() => {
		if (
			!isLoading &&
			CHAT_MODEL_IDS.includes(preferences.defaultModelId as ChatModelId)
		) {
			setSelectedChatModelId(preferences.defaultModelId)
		}
	}, [isLoading, preferences.defaultModelId])

	const chatHistory = useMemo(
		() =>
			(conversation?.messages ?? []).map((message) => ({
				role: message.role,
				content: message.content,
			})),
		[conversation?.messages],
	)

	const handleModelChange = useCallback(
		async (modelId: string) => {
			setSelectedChatModelId(modelId)
			await savePreferences({
				...preferences,
				defaultModelId: modelId,
			})
		},
		[preferences, savePreferences],
	)

	const handleSubmit = useCallback(
		async ({ text, generationMode: submitMode, attachments }: ChatSubmitPayload) => {
			if (!hasApiKey) {
				setError('Add your Gemini API key in Settings before generating.')
				return
			}

			setError(null)
			setIsGenerating(true)

			const resolved = resolvePromptIntent(
				text,
				selectedChatModelId,
				submitMode,
			)

			if (resolved.intent !== 'chat' && !text.trim()) {
				setError('Add a prompt when using image, music, or video mode.')
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
				await appendMessages([userMessage], selectedChatModelId)

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

				await appendMessages([assistantMessage], selectedChatModelId)

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
			hasApiKey,
			preferences,
			selectedChatModelId,
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
					<h1 className="text-lg font-semibold">Home</h1>
					<p className="text-xs text-muted-foreground">
						One continuous conversation with {aiName} · try &quot;generate an
						image of…&quot;, &quot;generate music&quot;, or &quot;create a
						video&quot;
						{lastIntent ? ` · last: ${lastIntent}` : ''}
					</p>
				</div>
				<ChatModelSelector
					value={selectedChatModelId}
					onChange={handleModelChange}
				/>
			</header>

			<div className="hidden shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2 md:hidden">
				<p className="text-xs text-muted-foreground">
					{selectedModel?.name ?? 'Chat model'} · tap + to attach or change mode
				</p>
			</div>

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
				generationMode={generationMode}
				selectedChatModelId={selectedChatModelId}
				onGenerationModeChange={setGenerationMode}
				onChatModelChange={(modelId) => {
					void handleModelChange(modelId)
				}}
				onSubmit={(payload) => {
					void handleSubmit(payload)
				}}
				onStop={() => setIsGenerating(false)}
			/>
		</div>
	)
}
