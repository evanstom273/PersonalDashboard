import { usePreferencesContext, useMainConversationContext } from '@/providers/ChatProvider'
import { generateChatWithTools } from '@/services/gemini/chatWithTools'
import type { GenerationIntent } from '@/services/gemini/constants'
import { confirmDocumentDeletion } from '@/services/gemini/documentTools'
import { getIntentLabel, resolvePromptIntent } from '@/services/gemini/intent'
import { getGenerationModelPreferences } from '@/services/gemini/modelPreferences'
import { getModelById } from '@/services/gemini/models'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { runModelGeneration } from '@/services/gemini'
import { saveMessageMediaToLibrary } from '@/services/library/libraryMediaService'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { ChatSubmitPayload } from '@/types/chat'
import { Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatModelSelector } from '@/components/chat/ChatModelSelector'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'

export function ChatPage() {
	const { preferences, savePreferences } = usePreferencesContext()
	const {
		conversation,
		appendMessages,
		updateMessage,
		ensureConversation,
		clearConversation,
	} = useMainConversationContext()

	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastIntent, setLastIntent] = useState<string | null>(null)
	const [webSearchEnabled, setWebSearchEnabled] = useState(false)
	const [forcedNextIntent, setForcedNextIntent] =
		useState<GenerationIntent | null>(null)
	const [clearDialogOpen, setClearDialogOpen] = useState(false)
	const [isClearing, setIsClearing] = useState(false)

	const aiName = getConfiguredAiName(preferences)
	const selectedModel = getModelById(preferences.defaultModelId)
	const hasApiKey = preferences.geminiApiKey.trim().length > 0
	const messageCount = conversation?.messages.length ?? 0

	const chatHistory = useMemo(
		() =>
			(conversation?.messages ?? []).map((message) => ({
				role: message.role,
				content: message.content,
			})),
		[conversation?.messages],
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

				await appendMessages([assistantMessage], preferences.defaultModelId)

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

	const handleClearChat = useCallback(async () => {
		setIsClearing(true)
		try {
			await clearConversation()
			setLastIntent(null)
			setError(null)
			setForcedNextIntent(null)
			setClearDialogOpen(false)
		} finally {
			setIsClearing(false)
		}
	}, [clearConversation])

	const clearChatButton = (
		<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={messageCount === 0 || isGenerating}
					className="shrink-0"
				>
					<Trash2 className="h-4 w-4" />
					<span className="hidden sm:inline">Clear chat</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Clear this conversation?</DialogTitle>
					<DialogDescription>
						This permanently deletes all {messageCount} message
						{messageCount === 1 ? '' : 's'} in your continuous chat. Documents
						and library items are not affected.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						variant="destructive"
						disabled={isClearing}
						onClick={() => {
							void handleClearChat()
						}}
					>
						{isClearing ? 'Clearing…' : 'Clear chat'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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
				<div className="flex flex-wrap items-center gap-2">
					{clearChatButton}
					<ChatModelSelector
						value={preferences.defaultModelId}
						onChange={(modelId) => {
							void saveModelPreference({ defaultModelId: modelId })
						}}
					/>
				</div>
			</header>

			<div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2 md:hidden">
				<p className="min-w-0 text-xs text-muted-foreground">
					{selectedModel?.name ?? 'Chat model'} · tap + for models
				</p>
				{clearChatButton}
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
