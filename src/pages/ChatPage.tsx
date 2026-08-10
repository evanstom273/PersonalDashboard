import { usePreferencesContext, useMainConversationContext } from '@/providers/ChatProvider'
import { CHAT_MODEL_IDS, type ChatModelId } from '@/services/gemini/constants'
import { getIntentLabel, resolvePromptIntent } from '@/services/gemini/intent'
import { getModelById } from '@/services/gemini/models'
import { runModelGeneration } from '@/services/gemini'
import type { StoredMessage } from '@/storage/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatModelSelector } from '@/components/chat/ChatModelSelector'

export function ChatPage() {
	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const { conversation, appendMessages, ensureConversation } =
		useMainConversationContext()

	const [selectedChatModelId, setSelectedChatModelId] = useState(
		preferences.defaultModelId,
	)
	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastIntent, setLastIntent] = useState<string | null>(null)

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
		async (text: string) => {
			if (!hasApiKey) {
				setError('Add your Gemini API key in Settings before generating.')
				return
			}

			setError(null)
			setIsGenerating(true)

			const resolved = resolvePromptIntent(text, selectedChatModelId)
			setLastIntent(getIntentLabel(resolved.intent))

			try {
				await ensureConversation()

				const userMessage: StoredMessage = {
					id: crypto.randomUUID(),
					role: 'user',
					content: text,
					createdAt: Date.now(),
				}
				await appendMessages([userMessage], selectedChatModelId)

				const history =
					resolved.intent === 'chat'
						? chatHistory
						: []

				const result = await runModelGeneration(
					preferences.geminiApiKey,
					resolved.modelId,
					resolved.prompt,
					history,
				)

				const modelUsed = getModelById(resolved.modelId)
				const prefix =
					resolved.intent === 'chat'
						? ''
						: `[${getIntentLabel(resolved.intent)} · ${modelUsed?.name ?? resolved.modelId}]\n`

				const assistantMessage: StoredMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: `${prefix}${result.text}`,
					media: result.media.length > 0 ? result.media : undefined,
					createdAt: Date.now(),
				}

				await appendMessages([assistantMessage], selectedChatModelId)
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
			preferences.geminiApiKey,
			selectedChatModelId,
		],
	)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="hidden shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:flex md:px-6">
				<div>
					<h1 className="text-lg font-semibold">Home</h1>
					<p className="text-xs text-muted-foreground">
						One continuous conversation · say &quot;generate image&quot;, &quot;generate
						music&quot;, or &quot;generate video&quot; to switch modes
						{lastIntent ? ` · last: ${lastIntent}` : ''}
					</p>
				</div>
				<ChatModelSelector
					value={selectedChatModelId}
					onChange={handleModelChange}
				/>
			</header>

			<div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2 md:hidden">
				<p className="text-xs text-muted-foreground">
					{selectedModel?.name ?? 'Chat model'}
				</p>
				<ChatModelSelector
					value={selectedChatModelId}
					onChange={handleModelChange}
				/>
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
			/>

			<ChatInput
				disabled={!hasApiKey}
				isGenerating={isGenerating}
				onSubmit={(prompt) => {
					void handleSubmit(prompt)
				}}
				onStop={() => setIsGenerating(false)}
			/>
		</div>
	)
}
