import type { GenerationIntent } from '@/services/gemini/constants'
import {
	useChatGenerationContext,
	useMainConversationContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'
import { confirmDocumentDeletion } from '@/services/gemini/documentTools'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import type { UserPreferences } from '@/storage/types'
import { useCallback, useEffect, useState } from 'react'
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
		clearConversation,
		replaceConversation,
	} = useMainConversationContext()
	const {
		isGenerating,
		error,
		lastIntent,
		streamingAssistant,
		submitMessage,
		stopGeneration,
		clearCompletionNotice,
	} = useChatGenerationContext()

	const [webSearchEnabled, setWebSearchEnabled] = useState(false)
	const [forcedNextIntent, setForcedNextIntent] =
		useState<GenerationIntent | null>(null)

	const aiName = getConfiguredAiName(preferences)
	const hasApiKey = preferences.geminiApiKey.trim().length > 0

	useEffect(() => {
		clearCompletionNotice()
	}, [clearCompletionNotice])

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
		stopGeneration()
		await clearConversation()
		setForcedNextIntent(null)
	}, [clearConversation, stopGeneration])

	const handleImportChat = useCallback(
		async (imported: Parameters<typeof replaceConversation>[0]) => {
			await replaceConversation(imported)
			setForcedNextIntent(null)
		},
		[replaceConversation],
	)

	const handleSubmit = useCallback(
		async (payload: Parameters<typeof submitMessage>[0]) => {
			const activeForcedIntent = forcedNextIntent
			if (activeForcedIntent) {
				setForcedNextIntent(null)
			}

			await submitMessage(payload, { forcedNextIntent: activeForcedIntent })
		},
		[forcedNextIntent, submitMessage],
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
				streamingAssistant={streamingAssistant}
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
				onStop={stopGeneration}
			/>
		</div>
	)
}
