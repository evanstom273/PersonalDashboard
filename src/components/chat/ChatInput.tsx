import { ArrowUp, Mic, Square, X } from 'lucide-react'
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
} from 'react'
import { DocumentMentionMenu } from '@/components/chat/DocumentMentionMenu'
import { Button } from '@/components/ui/button'
import { useDocumentMentionPicker } from '@/hooks/useDocumentMentionPicker'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { insertDocumentMention } from '@/utils/documentMentions'
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
	const [cursorPosition, setCursorPosition] = useState(0)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

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

	const {
		isOpen: isMentionMenuOpen,
		activeMention,
		filteredDocuments,
		selectedIndex,
		moveSelection,
	} = useDocumentMentionPicker(prompt, cursorPosition, !inputDisabled)

	useEffect(() => {
		if (isListening) {
			setPrompt(transcript)
			setCursorPosition(transcript.length)
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

	const syncCursor = useCallback(() => {
		const nextPosition = textareaRef.current?.selectionStart ?? prompt.length
		setCursorPosition(nextPosition)
	}, [prompt.length])

	const insertMention = useCallback(
		(title: string) => {
			if (!activeMention) {
				return
			}

			const { nextText, nextCursor } = insertDocumentMention(
				prompt,
				activeMention,
				title,
			)
			setPrompt(nextText)
			setCursorPosition(nextCursor)

			requestAnimationFrame(() => {
				const textarea = textareaRef.current
				if (!textarea) {
					return
				}
				textarea.focus()
				textarea.setSelectionRange(nextCursor, nextCursor)
			})
		},
		[activeMention, prompt],
	)

	function handleSubmit(event?: FormEvent): void {
		event?.preventDefault()
		const trimmed = prompt.trim()
		if (!trimmed || disabled || isGenerating || isListening) {
			return
		}

		onSubmit(trimmed)
		setPrompt('')
		setCursorPosition(0)
		resetSpeechState()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
		if (isMentionMenuOpen) {
			if (event.key === 'ArrowDown') {
				event.preventDefault()
				moveSelection(1)
				return
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault()
				moveSelection(-1)
				return
			}

			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()
				const selected = filteredDocuments[selectedIndex]
				if (selected) {
					insertMention(selected.title)
				}
				return
			}

			if (event.key === 'Escape') {
				event.preventDefault()
				return
			}
		}

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
		setCursorPosition(transcript.trim().length)
	}

	function handleCancelSpeech(): void {
		cancelListening()
		if (isListening) {
			setPrompt('')
			setCursorPosition(0)
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

			<div className="relative mx-auto max-w-3xl">
				{isMentionMenuOpen ? (
					<DocumentMentionMenu
						documents={filteredDocuments}
						selectedIndex={selectedIndex}
						onSelect={(document) => insertMention(document.title)}
						className="absolute right-0 bottom-full left-0 mb-2"
					/>
				) : null}

				<div
					className={cn(
						'flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm',
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
						ref={textareaRef}
						value={prompt}
						onChange={(event) => {
							setPrompt(event.target.value)
							setCursorPosition(event.target.selectionStart)
						}}
						onClick={syncCursor}
						onKeyUp={syncCursor}
						onKeyDown={handleKeyDown}
						placeholder={
							isListening
								? 'Listening…'
								: 'Message… type @ to reference a document'
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
			</div>

			<p className="mx-auto mt-2 hidden max-w-3xl text-center text-xs text-muted-foreground md:block">
				Type <span className="font-medium text-foreground">@</span> to search and
				reference documents. Use the mic to dictate, review with Continue, then
				send.
			</p>
		</form>
	)
}
