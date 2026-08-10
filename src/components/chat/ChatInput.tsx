import { ArrowUp, Square } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
	disabled?: boolean
	isGenerating?: boolean
	onSubmit: (prompt: string) => void
	onStop?: () => void
}

export function ChatInput({
	disabled,
	isGenerating,
	onSubmit,
	onStop,
}: ChatInputProps) {
	const [prompt, setPrompt] = useState('')

	function handleSubmit(event?: FormEvent): void {
		event?.preventDefault()
		const trimmed = prompt.trim()
		if (!trimmed || disabled || isGenerating) {
			return
		}
		onSubmit(trimmed)
		setPrompt('')
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			handleSubmit()
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="border-t border-border bg-background px-4 py-4 md:px-8"
		>
			<div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
				<textarea
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					onKeyDown={handleKeyDown}
					placeholder='Message Gemini… or "generate image …", "generate music …", "generate video …"'
					disabled={disabled || isGenerating}
					rows={1}
					className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
				/>
				{isGenerating ? (
					<Button
						type="button"
						size="icon"
						variant="secondary"
						onClick={onStop}
						aria-label="Stop generating"
					>
						<Square className="h-4 w-4" />
					</Button>
				) : (
					<Button
						type="submit"
						size="icon"
						disabled={disabled || !prompt.trim()}
						aria-label="Send message"
					>
						<ArrowUp className="h-4 w-4" />
					</Button>
				)}
			</div>
			<p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
				Chat uses Gemini 3.6 Flash or 3.1 Pro. Generation commands pick image,
				music, or video models automatically.
			</p>
		</form>
	)
}
