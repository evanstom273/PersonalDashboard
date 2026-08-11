import { ArrowUp, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { useDevStudio } from '@/providers/DevStudioProvider'

export function DevStudioComposer() {
	const { preferences } = usePreferencesContext()
	const {
		appendMessage,
		isComposerSending,
		setComposerSending,
		isConfigured,
	} = useDevStudio()
	const [draft, setDraft] = useState('')

	const handleSubmit = useCallback(async () => {
		const trimmed = draft.trim()
		if (!trimmed || isComposerSending) {
			return
		}

		const userMessage = {
			id: crypto.randomUUID(),
			role: 'user' as const,
			content: trimmed,
			createdAt: Date.now(),
		}

		appendMessage(userMessage)
		setDraft('')
		setComposerSending(true)

		window.setTimeout(() => {
			appendMessage({
				id: crypto.randomUUID(),
				role: 'assistant',
				content: isConfigured
					? 'Scaffold reply: agent tools and workspace reads are not wired yet. Your message was captured in the Dev Studio session.'
					: 'Connect GitHub in Settings first, then I can work against your repository workspace.',
				createdAt: Date.now(),
			})
			setComposerSending(false)
		}, 500)
	}, [
		appendMessage,
		draft,
		isComposerSending,
		isConfigured,
		setComposerSending,
	])

	return (
		<div className="dev-studio-composer shrink-0 border-t border-border/70 px-4 py-3 md:px-5">
			<div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-background/50 p-2">
				<textarea
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault()
							void handleSubmit()
						}
					}}
					rows={1}
					placeholder={
						preferences.geminiApiKey.trim()
							? 'Ask the code agent to inspect or change the repo…'
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
