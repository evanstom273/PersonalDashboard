import { ArrowUp, Mic, Square, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { cn } from '@/utils/cn'

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

	const {
		isSupported,
		status,
		transcript,
		error: speechError,
		startListening,
		continueListening,
		cancelListening,
	} = useSpeechRecognition()

	const isListening = status === 'listening'
	const isReviewing = status === 'review'
	const inputDisabled = disabled || isGenerating || isListening

	useEffect(() => {
		if (isListening) {
			setPrompt(transcript)
		}
	}, [isListening, transcript])

	const resetSpeechState = useCallback(() => {
		if (isListening) {
			cancelListening()
			return
		}

		if (isReviewing) {
			cancelListening()
		}
	}, [cancelListening, isListening, isReviewing])

	function handleSubmit(event?: FormEvent): void {
		event?.preventDefault()
		const trimmed = prompt.trim()
		if (!trimmed || disabled || isGenerating || isListening) {
			return
		}

		onSubmit(trimmed)
		setPrompt('')
		resetSpeechState()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			handleSubmit()
		}
	}

	function handleMicPress(): void {
		if (disabled || isGenerating || isListening) {
			return
		}

		startListening(isReviewing ? prompt : '')
	}

	function handleContinue(): void {
		continueListening()
		setPrompt(transcript.trim())
	}

	function handleCancelSpeech(): void {
		cancelListening()
		if (isListening) {
			setPrompt('')
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="shrink-0 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8 md:py-4"
		>
			{isListening ? (
				<div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 text-xs text-primary">
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
					</span>
					Listening… speak now. Press Continue to review before sending.
				</div>
			) : null}

			{isReviewing && prompt.trim() ? (
				<div className="mx-auto mb-2 max-w-3xl text-xs text-muted-foreground">
					Edit your message below, then send when ready.
				</div>
			) : null}

			{speechError ? (
				<div className="mx-auto mb-2 max-w-3xl text-xs text-destructive">
					{speechError}
				</div>
			) : null}

			<div
				className={cn(
					'mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm',
					isListening ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border',
				)}
			>
				{isSupported ? (
					<Button
						type="button"
						size="icon"
						variant={isListening ? 'default' : 'outline'}
						disabled={disabled || isGenerating}
						onClick={handleMicPress}
						aria-label="Start voice input"
						className={cn(isListening && 'animate-pulse')}
					>
						<Mic className="h-4 w-4" />
					</Button>
				) : null}

				<textarea
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={
						isListening
							? 'Listening…'
							: 'Message Gemini… or "generate image …"'
					}
					disabled={inputDisabled}
					readOnly={isListening}
					rows={1}
					className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
				/>

				{isListening ? (
					<>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							onClick={handleCancelSpeech}
							aria-label="Cancel voice input"
						>
							<X className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="secondary"
							onClick={handleContinue}
							className="shrink-0"
						>
							Continue
						</Button>
					</>
				) : isGenerating ? (
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

			<p className="mx-auto mt-2 hidden max-w-3xl text-center text-xs text-muted-foreground md:block">
				Use the mic to dictate, review with Continue, then send. Chat uses Gemini
				3.6 Flash or 3.1 Pro; say generate image, music, or video to switch
				modes.
			</p>
		</form>
	)
}
