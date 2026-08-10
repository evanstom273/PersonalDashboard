import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { Button } from '@/components/ui/button'
import {
	useConversationsContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'
import { runModelGeneration } from '@/services/gemini'
import { getModelById } from '@/services/gemini/models'
import type { StoredMessage } from '@/storage/types'

export function ChatPage() {
	const { preferences, savePreferences } = usePreferencesContext()
	const {
		activeConversation,
		activeConversationId,
		startConversation,
		appendMessages,
		selectConversation,
		updateConversationModel,
	} = useConversationsContext()

	const [selectedModelId, setSelectedModelId] = useState(
		preferences.defaultModelId,
	)
	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const currentModelId = activeConversation?.modelId ?? selectedModelId
	const selectedModel = getModelById(currentModelId)
	const hasApiKey = preferences.geminiApiKey.trim().length > 0

	useEffect(() => {
		if (activeConversation?.modelId) {
			setSelectedModelId(activeConversation.modelId)
		}
	}, [activeConversation?.modelId])

	const chatHistory = useMemo(
		() =>
			selectedModel?.category === 'chat'
				? (activeConversation?.messages ?? []).map((message) => ({
						role: message.role,
						content: message.content,
					}))
				: [],
		[activeConversation?.messages, selectedModel?.category],
	)

	const handleModelChange = useCallback(
		async (modelId: string) => {
			setSelectedModelId(modelId)
			await savePreferences({
				...preferences,
				defaultModelId: modelId,
			})
			if (activeConversationId) {
				await updateConversationModel(activeConversationId, modelId)
			}
		},
		[
			activeConversationId,
			preferences,
			savePreferences,
			updateConversationModel,
		],
	)

	const handleSubmit = useCallback(
		async (prompt: string) => {
			if (!hasApiKey) {
				setError('Add your Gemini API key in Settings before generating.')
				return
			}

			setError(null)
			setIsGenerating(true)

			let conversationId = activeConversationId

			try {
				if (!conversationId) {
					const created = await startConversation(currentModelId)
					conversationId = created.id
				}

				const userMessage: StoredMessage = {
					id: crypto.randomUUID(),
					role: 'user',
					content: prompt,
					createdAt: Date.now(),
				}

				await appendMessages(conversationId, [userMessage], currentModelId)

				const result = await runModelGeneration(
					preferences.geminiApiKey,
					currentModelId,
					prompt,
					chatHistory,
				)

				const assistantMessage: StoredMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: result.text,
					media: result.media.length > 0 ? result.media : undefined,
					createdAt: Date.now(),
				}

				await appendMessages(conversationId, [assistantMessage], currentModelId)
				await selectConversation(conversationId)
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
			activeConversationId,
			appendMessages,
			chatHistory,
			currentModelId,
			hasApiKey,
			preferences.geminiApiKey,
			selectConversation,
			startConversation,
		],
	)

	return (
		<div className="flex h-full flex-col">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
				<div>
					<h1 className="text-lg font-semibold">
						{activeConversation?.title ?? 'New chat'}
					</h1>
					<p className="text-xs text-muted-foreground">
						{selectedModel
							? `${selectedModel.name} · ${selectedModel.description}`
							: 'Select a model'}
					</p>
				</div>
				<ModelSelector value={currentModelId} onChange={handleModelChange} />
			</header>

			{!hasApiKey ? (
				<div className="border-b border-border bg-secondary/40 px-4 py-3 text-sm md:px-6">
					<span className="text-muted-foreground">
						No API key configured.{' '}
					</span>
					<Button asChild variant="ghost" className="h-auto p-0 text-primary hover:underline">
						<Link to="/settings">Add your Gemini API key</Link>
					</Button>
				</div>
			) : null}

			{error ? (
				<div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:px-6">
					{error}
				</div>
			) : null}

			<ChatMessages
				messages={activeConversation?.messages ?? []}
				isGenerating={isGenerating}
			/>

			<ChatInput
				modelId={currentModelId}
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
