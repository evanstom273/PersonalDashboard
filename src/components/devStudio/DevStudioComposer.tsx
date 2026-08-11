import { ArrowUp, Loader2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateDevStudioChat } from '@/services/devStudio/devStudioAgent'
import { getGenerationModelPreferences } from '@/services/gemini/modelPreferences'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { parseRepositorySlug } from '@/types/devStudio'

export function DevStudioComposer() {
	const { preferences } = usePreferencesContext()
	const {
		appendMessage,
		isComposerSending,
		setComposerSending,
		isConfigured,
		messages,
		buildToolContext,
		setStreamingAssistant,
		repositorySlug,
		branch,
	} = useDevStudio()
	const [draft, setDraft] = useState('')
	const streamingRef = useRef('')
	const abortRef = useRef<AbortController | null>(null)

	const handleSubmit = useCallback(async () => {
		const trimmed = draft.trim()
		if (!trimmed || isComposerSending) {
			return
		}

		const apiKey = preferences.geminiApiKey.trim()
		if (!apiKey) {
			appendMessage({
				id: crypto.randomUUID(),
				role: 'assistant',
				content: 'Add your Gemini API key in Settings before chatting.',
				createdAt: Date.now(),
			})
			return
		}

		if (!isConfigured) {
			appendMessage({
				id: crypto.randomUUID(),
				role: 'user',
				content: trimmed,
				createdAt: Date.now(),
			})
			appendMessage({
				id: crypto.randomUUID(),
				role: 'assistant',
				content: 'Connect GitHub in Settings first, then I can work against your repository workspace.',
				createdAt: Date.now(),
			})
			setDraft('')
			return
		}

		const repo = parseRepositorySlug(repositorySlug)
		if (!repo) {
			return
		}
		repo.branch = branch

		const toolContext = buildToolContext()
		if (!toolContext) {
			return
		}

		const userMessage = {
			id: crypto.randomUUID(),
			role: 'user' as const,
			content: trimmed,
			createdAt: Date.now(),
		}

		const nextMessages = [...messages, userMessage]
		appendMessage(userMessage)
		setDraft('')
		setComposerSending(true)
		streamingRef.current = ''

		const assistantMessageId = crypto.randomUUID()
		setStreamingAssistant({ id: assistantMessageId, content: '' })

		const abortController = new AbortController()
		abortRef.current = abortController

		try {
			const modelId = getGenerationModelPreferences(preferences).chatModelId
			const reply = await generateDevStudioChat(
				apiKey,
				modelId,
				nextMessages,
				preferences,
				repo,
				toolContext,
				{
					signal: abortController.signal,
					onTextDelta: (delta) => {
						streamingRef.current += delta
						setStreamingAssistant({
							id: assistantMessageId,
							content: streamingRef.current,
						})
					},
					onToolActivity: () => {
						if (!streamingRef.current.trim()) {
							setStreamingAssistant({
								id: assistantMessageId,
								content: 'Using workspace tools…',
							})
						}
					},
				},
			)

			appendMessage({
				id: assistantMessageId,
				role: 'assistant',
				content: reply,
				createdAt: Date.now(),
			})
			setStreamingAssistant(null)
		} catch (caught) {
			appendMessage({
				id: assistantMessageId,
				role: 'assistant',
				content:
					caught instanceof DOMException && caught.name === 'AbortError'
						? 'Generation stopped.'
						: caught instanceof Error
							? caught.message
							: 'Generation failed.',
				createdAt: Date.now(),
			})
			setStreamingAssistant(null)
		} finally {
			setComposerSending(false)
			abortRef.current = null
		}
	}, [
		appendMessage,
		branch,
		buildToolContext,
		draft,
		isComposerSending,
		isConfigured,
		messages,
		preferences,
		repositorySlug,
		setComposerSending,
		setStreamingAssistant,
	])

	return (
		<div className="dev-studio-composer shrink-0 border-t border-border/70 px-4 py-3 md:px-5">
			<div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-background/50 p-2">
				<textarea
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					rows={1}
					enterKeyHint="enter"
					placeholder={
						preferences.geminiApiKey.trim()
							? 'Ask the code agent to inspect, edit, push, or merge PRs…'
							: 'Add your Gemini API key in Settings to chat'
					}
					className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
				/>
				<Button
					type="button"
					size="icon"
					onClick={() => void handleSubmit()}
					disabled={!draft.trim() || isComposerSending}
					aria-label="Send message"
				>
					{isComposerSending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<ArrowUp className="h-4 w-4" />
					)}
				</Button>
			</div>
		</div>
	)
}
