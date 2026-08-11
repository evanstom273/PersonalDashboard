import { ArrowUp, Mic, Square, X } from 'lucide-react'
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DevStudioAttachMenu } from '@/components/devStudio/DevStudioModelSelector'
import { DevStudioResumeBanner } from '@/components/devStudio/DevStudioTaskStatus'
import { DocumentMentionMenu } from '@/components/chat/DocumentMentionMenu'
import { useDocumentMentionPicker } from '@/hooks/useDocumentMentionPicker'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { runDevStudioAgentWithContinue } from '@/services/devStudio/runDevStudioAgentWithContinue'
import { DEV_STUDIO_TIMEOUT_MESSAGE } from '@/services/devStudio/devStudioAgentTypes'
import { resolveDevStudioModelId } from '@/services/devStudio/devStudioModels'
import { createDocument } from '@/services/documents/documentService'
import { ingestUploadedDocumentContent } from '@/utils/documentContent'
import { buildDocumentMention, insertDocumentMention } from '@/utils/documentMentions'
import {
	getFileBaseName,
	isImageFile,
	isUploadableDocumentFile,
	readFileAsDataUrl,
	readUploadableDocumentContent,
} from '@/utils/fileAttachments'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { useDevStudio } from '@/providers/DevStudioProvider'
import type { ChatAttachment, ChatInputMethod } from '@/types/chat'
import type { DevStudioAgentPhase, DevStudioStreamingState } from '@/types/devStudio'
import { parseRepositorySlug } from '@/types/devStudio'
import type { MessageMedia, StoredMessage } from '@/storage/types'
import { formatDevStudioToolLabel } from '@/utils/devStudioToolLabels'
import {
	buildDevStudioResumeUserMessage,
	hasAgentStagedChanges,
} from '@/utils/devStudioTaskStatus'
import { startDevStudioAgentWallClockGuard } from '@/utils/devStudioAgentWallClock'
import { cn } from '@/utils/cn'

function createStreamingState(id: string): DevStudioStreamingState {
	return {
		id,
		content: '',
		thoughts: '',
		phase: 'thinking',
		startedAt: Date.now(),
		activities: [],
	}
}

function appendActivity(
	state: DevStudioStreamingState,
	toolName: string,
	args: Record<string, unknown>,
): DevStudioStreamingState {
	return {
		...state,
		phase: 'tool',
		activities: [
			...state.activities,
			{
				id: crypto.randomUUID(),
				label: formatDevStudioToolLabel(toolName, args),
				status: 'running',
				startedAt: Date.now(),
			},
		],
	}
}

function completeLatestActivity(
	state: DevStudioStreamingState,
): DevStudioStreamingState {
	const reverseIndex = [...state.activities]
		.reverse()
		.findIndex((activity) => activity.status === 'running')
	if (reverseIndex < 0) {
		return state
	}

	const index = state.activities.length - 1 - reverseIndex
	const activities = [...state.activities]
	activities[index] = {
		...activities[index],
		status: 'done',
		endedAt: Date.now(),
	}
	return { ...state, activities }
}

export function DevStudioComposer() {
	const location = useLocation()
	const { preferences } = usePreferencesContext()
	const {
		appendMessage,
		isComposerSending,
		setComposerSending,
		isConfigured,
		messages,
		stagedChanges,
		agentTaskStatus,
		setAgentTaskStatus,
		buildToolContext,
		setStreamingAssistant,
		repositorySlug,
		branch,
	} = useDevStudio()

	const [draft, setDraft] = useState('')
	const [cursorPosition, setCursorPosition] = useState(0)
	const [attachments, setAttachments] = useState<ChatAttachment[]>([])
	const [attachError, setAttachError] = useState<string | null>(null)
	const [, setInputMethod] = useState<ChatInputMethod>('typed')

	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const mentionAnchorRef = useRef<HTMLDivElement>(null)
	const promptBeforeSpeechRef = useRef('')
	const streamingRef = useRef('')
	const thoughtsRef = useRef('')
	const abortRef = useRef<AbortController | null>(null)

	const [mentionMenuStyle, setMentionMenuStyle] = useState<CSSProperties | null>(null)

	useEffect(() => {
		const initialPrompt = (location.state as { initialPrompt?: string } | null)?.initialPrompt
		if (initialPrompt) {
			setDraft(initialPrompt)
			setCursorPosition(initialPrompt.length)
			window.history.replaceState({}, document.title)
		}
	}, [location.state])

	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current
		if (!textarea) {
			return
		}

		textarea.style.height = '0px'
		const maxHeight = Math.max(400, Math.floor(window.innerHeight * 0.5))
		const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
		textarea.style.height = `${nextHeight}px`
		textarea.style.overflowY =
			textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
	}, [])

	const {
		isSupported,
		status,
		transcript,
		error: speechError,
		hint: speechHint,
		startListening,
		continueListening,
		cancelListening,
	} = useSpeechRecognition({
		geminiApiKey: preferences.geminiApiKey,
		transcriptionModelId: preferences.defaultModelId,
	})

	const isListening = status === 'listening'
	const isTranscribing = status === 'transcribing'
	const inputDisabled = isComposerSending || isListening || isTranscribing

	const {
		isOpen: isMentionMenuOpen,
		activeMention,
		filteredDocuments,
		selectedIndex,
		moveSelection,
	} = useDocumentMentionPicker(draft, cursorPosition, !inputDisabled)

	const updateMentionMenuPosition = useCallback(() => {
		const anchor = mentionAnchorRef.current
		const textarea = textareaRef.current
		if (!anchor || !textarea) {
			return
		}

		const anchorRect = anchor.getBoundingClientRect()
		const textareaRect = textarea.getBoundingClientRect()
		const gap = 8
		const maxHeight = Math.max(160, textareaRect.top - gap - 16)

		setMentionMenuStyle({
			position: 'fixed',
			left: anchorRect.left,
			width: anchorRect.width,
			bottom: window.innerHeight - textareaRect.top + gap,
			maxHeight,
			zIndex: 60,
		})
	}, [])

	useLayoutEffect(() => {
		if (!isMentionMenuOpen) {
			setMentionMenuStyle(null)
			return
		}

		updateMentionMenuPosition()

		const handleLayoutChange = () => {
			updateMentionMenuPosition()
		}

		window.addEventListener('resize', handleLayoutChange)
		window.addEventListener('scroll', handleLayoutChange, true)
		window.visualViewport?.addEventListener('resize', handleLayoutChange)
		window.visualViewport?.addEventListener('scroll', handleLayoutChange)

		return () => {
			window.removeEventListener('resize', handleLayoutChange)
			window.removeEventListener('scroll', handleLayoutChange, true)
			window.visualViewport?.removeEventListener('resize', handleLayoutChange)
			window.visualViewport?.removeEventListener('scroll', handleLayoutChange)
		}
	}, [isMentionMenuOpen, draft, cursorPosition, updateMentionMenuPosition])

	useEffect(() => {
		if (isListening) {
			setDraft(transcript)
			setCursorPosition(transcript.length)
		}
	}, [isListening, transcript])

	useEffect(() => {
		adjustTextareaHeight()
	}, [adjustTextareaHeight, draft])

	const syncCursor = useCallback(() => {
		const nextPosition = textareaRef.current?.selectionStart ?? draft.length
		setCursorPosition(nextPosition)
	}, [draft.length])

	const updateStreaming = useCallback(
		(updater: (current: DevStudioStreamingState) => DevStudioStreamingState) => {
			setStreamingAssistant((current) => {
				if (!current) {
					return current
				}
				return updater(current)
			})
		},
		[setStreamingAssistant],
	)

	const handleStop = useCallback(() => {
		abortRef.current?.abort()
	}, [])

	const resetSpeechState = useCallback(() => {
		if (isListening || status === 'review') {
			cancelListening()
		}
	}, [cancelListening, isListening, status])

	const insertMention = useCallback(
		(title: string) => {
			if (!activeMention) {
				return
			}

			const { nextText, nextCursor } = insertDocumentMention(
				draft,
				activeMention,
				title,
			)
			setDraft(nextText)
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
		[activeMention, draft],
	)

	async function handleDocumentUploads(files: File[]): Promise<void> {
		setAttachError(null)

		if (files.length === 0) {
			return
		}

		const results = await Promise.allSettled(
			files.map(async (file) => {
				if (!isUploadableDocumentFile(file)) {
					throw new Error(
						`${file.name} is not a supported document (.txt, .md, .html, .pdf, etc.).`,
					)
				}

				const raw = await readUploadableDocumentContent(file)
				const { content, contentFormat } = ingestUploadedDocumentContent(file, raw)
				const title = getFileBaseName(file.name) || 'Uploaded document'
				const document = await createDocument(title, content, {
					source: 'upload',
					contentFormat,
				})

				return {
					id: crypto.randomUUID(),
					type: 'document' as const,
					name: document.title,
					documentId: document.id,
				}
			}),
		)

		const nextAttachments: ChatAttachment[] = []
		const errors: string[] = []

		for (const result of results) {
			if (result.status === 'fulfilled') {
				nextAttachments.push(result.value)
				continue
			}

			errors.push(
				result.reason instanceof Error
					? result.reason.message
					: 'Could not upload one of the documents.',
			)
		}

		if (nextAttachments.length > 0) {
			setAttachments((current) => [...current, ...nextAttachments])
		}

		if (errors.length > 0) {
			setAttachError(errors.join(' '))
		}
	}

	async function handleImageUploads(files: File[]): Promise<void> {
		setAttachError(null)

		if (files.length === 0) {
			return
		}

		const results = await Promise.allSettled(
			files.map(async (file) => {
				if (!isImageFile(file)) {
					throw new Error(`${file.name} is not an image file.`)
				}

				const { dataUrl, mimeType } = await readFileAsDataUrl(file)

				return {
					id: crypto.randomUUID(),
					type: 'image' as const,
					name: file.name,
					dataUrl,
					mimeType,
				}
			}),
		)

		const nextAttachments: ChatAttachment[] = []
		const errors: string[] = []

		for (const result of results) {
			if (result.status === 'fulfilled') {
				nextAttachments.push(result.value)
				continue
			}

			errors.push(
				result.reason instanceof Error
					? result.reason.message
					: 'Could not upload one of the images.',
			)
		}

		if (nextAttachments.length > 0) {
			setAttachments((current) => [...current, ...nextAttachments])
		}

		if (errors.length > 0) {
			setAttachError(errors.join(' '))
		}
	}

	function removeAttachment(id: string): void {
		setAttachments((current) => current.filter((item) => item.id !== id))
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
			void handleSubmit()
		}
	}

	function handleMicPress(): void {
		if (inputDisabled) {
			return
		}

		promptBeforeSpeechRef.current = draft
		void startListening(draft)
	}

	function handleContinueSpeech(): void {
		void continueListening().then((nextTranscript) => {
			const nextPrompt = nextTranscript.trim()
			setDraft(nextPrompt)
			setCursorPosition(nextPrompt.length)
			setInputMethod('speech')
		})
	}

	function handleCancelSpeech(): void {
		cancelListening()
		if (isListening || isTranscribing) {
			setDraft(promptBeforeSpeechRef.current)
			setCursorPosition(promptBeforeSpeechRef.current.length)
		}
	}

	const runAgentConversation = useCallback(
		async (conversationMessages: StoredMessage[]) => {
			const apiKey = preferences.geminiApiKey.trim()
			const repo = parseRepositorySlug(repositorySlug)
			if (!repo) {
				return
			}
			repo.branch = branch

			const toolContext = buildToolContext()
			if (!toolContext) {
				return
			}

			setComposerSending(true)
			setAgentTaskStatus('running')
			streamingRef.current = ''
			thoughtsRef.current = ''

			const assistantMessageId = crypto.randomUUID()
			setStreamingAssistant(createStreamingState(assistantMessageId))

			const abortController = new AbortController()
			abortRef.current = abortController

			const wallClockGuard = startDevStudioAgentWallClockGuard({
				abortController,
				onWarning: () => {
					updateStreaming((current) => ({
						...current,
						showLongRunWarning: true,
					}))
				},
			})

			const setPhase = (phase: DevStudioAgentPhase) => {
				updateStreaming((current) => ({ ...current, phase }))
			}

			try {
				const modelId = resolveDevStudioModelId(preferences.devStudioModelId)
				const result = await runDevStudioAgentWithContinue(
					apiKey,
					modelId,
					conversationMessages,
					preferences,
					repo,
					toolContext,
					{
						signal: abortController.signal,
						onThoughtDelta: (delta) => {
							thoughtsRef.current += delta
							updateStreaming((current) => ({
								...current,
								thoughts: thoughtsRef.current,
								phase: 'thinking',
							}))
						},
						onTextDelta: (delta) => {
							streamingRef.current += delta
							updateStreaming((current) => ({
								...current,
								content: streamingRef.current,
								phase: 'writing',
							}))
						},
						onPhaseChange: setPhase,
						onToolStart: (toolName, args) => {
							updateStreaming((current) => appendActivity(current, toolName, args))
						},
						onToolComplete: () => {
							updateStreaming((current) => completeLatestActivity(current))
						},
					},
					{
						autoContinue: preferences.devStudioAutoContinue,
					},
				)

				appendMessage({
					id: assistantMessageId,
					role: 'assistant',
					content: result.text,
					createdAt: Date.now(),
				})
				setAgentTaskStatus(result.status)
				setStreamingAssistant(null)
			} catch (caught) {
				const isAbort =
					caught instanceof DOMException && caught.name === 'AbortError'
				const timedOut = wallClockGuard.didTimeout()
				appendMessage({
					id: assistantMessageId,
					role: 'assistant',
					content: timedOut
						? DEV_STUDIO_TIMEOUT_MESSAGE
						: isAbort
							? 'Generation stopped.'
							: caught instanceof Error
								? caught.message
								: 'Generation failed.',
					createdAt: Date.now(),
				})
				setAgentTaskStatus(timedOut || isAbort ? 'stopped' : 'error')
				setStreamingAssistant(null)
			} finally {
				wallClockGuard.clear()
				setComposerSending(false)
				abortRef.current = null
			}
		},
		[
			appendMessage,
			branch,
			buildToolContext,
			preferences,
			repositorySlug,
			setAgentTaskStatus,
			setComposerSending,
			setStreamingAssistant,
			updateStreaming,
		],
	)

	const handleResume = useCallback(async () => {
		if (isComposerSending || !isConfigured) {
			return
		}

		const modelId = resolveDevStudioModelId(preferences.devStudioModelId)
		const resumeMessage: StoredMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: buildDevStudioResumeUserMessage(stagedChanges, modelId),
			createdAt: Date.now(),
		}

		appendMessage(resumeMessage)
		await runAgentConversation([...messages, resumeMessage])
	}, [
		appendMessage,
		isComposerSending,
		isConfigured,
		messages,
		preferences.devStudioModelId,
		runAgentConversation,
		stagedChanges,
	])

	const handleSubmit = useCallback(async () => {
		const trimmed = draft.trim()
		if ((!trimmed && attachments.length === 0) || isComposerSending || isListening) {
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
			setAttachments([])
			setAttachError(null)
			return
		}

		let messageText = trimmed
		const documentMentions = attachments
			.filter((attachment) => attachment.type === 'document')
			.map((attachment) => buildDocumentMention(attachment.name))

		for (const mention of documentMentions) {
			if (!messageText.includes(mention)) {
				messageText = messageText
					? `${messageText} ${mention}`
					: `Please review ${mention}`
			}
		}

		const imageMedia: MessageMedia[] = attachments
			.filter(
				(item): item is Extract<ChatAttachment, { type: 'image' }> =>
					item.type === 'image' && Boolean(item.dataUrl),
			)
			.map((item) => ({
				type: 'image' as const,
				mimeType: item.mimeType || 'image/png',
				dataUrl: item.dataUrl!,
			}))

		const userMessage: StoredMessage = {
			id: crypto.randomUUID(),
			role: 'user' as const,
			content: messageText,
			media: imageMedia.length > 0 ? imageMedia : undefined,
			createdAt: Date.now(),
		}

		const nextMessages = [...messages, userMessage]
		appendMessage(userMessage)
		setDraft('')
		setCursorPosition(0)
		setAttachments([])
		setAttachError(null)
		setInputMethod('typed')
		resetSpeechState()
		await runAgentConversation(nextMessages)
	}, [
		appendMessage,
		attachments,
		draft,
		isComposerSending,
		isConfigured,
		isListening,
		messages,
		preferences,
		resetSpeechState,
		runAgentConversation,
	])

	return (
		<div className="dev-studio-composer relative z-30 shrink-0 overflow-visible border-t border-border/70 px-3 py-2.5 md:px-5 md:py-3">
			{isListening ? (
				<div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 text-xs text-primary">
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
					</span>
					Listening... speak now. Press Continue when done.
				</div>
			) : null}

			{isTranscribing ? (
				<div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 text-xs text-primary">
					Transcribing your recording...
				</div>
			) : null}

			{speechError ? (
				<div className="mx-auto mb-2 max-w-3xl text-xs text-destructive">
					{speechError}
				</div>
			) : null}

			{speechHint ? (
				<div className="mx-auto mb-2 max-w-3xl text-xs text-muted-foreground">
					{speechHint}
				</div>
			) : null}

			{attachError ? (
				<div className="mx-auto mb-2 max-w-3xl text-xs text-destructive">
					{attachError}
				</div>
			) : null}

			{hasAgentStagedChanges(stagedChanges) ? (
				<DevStudioResumeBanner
					status={agentTaskStatus}
					disabled={isComposerSending}
					onResume={() => void handleResume()}
				/>
			) : null}

			{attachments.length > 0 ? (
				<div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
					{attachments.map((attachment) => (
						<div
							key={attachment.id}
							className="flex items-center gap-2 rounded-full surface-panel px-3 py-1.5 text-xs"
						>
							{attachment.type === 'image' && attachment.dataUrl ? (
								<img
									src={attachment.dataUrl}
									alt=""
									className="h-5 w-5 rounded object-cover"
								/>
							) : null}
							<span className="max-w-[10rem] truncate">{attachment.name}</span>
							<button
								type="button"
								className="text-muted-foreground hover:text-foreground"
								onClick={() => removeAttachment(attachment.id)}
								aria-label={`Remove ${attachment.name}`}
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					))}
				</div>
			) : null}

			<div ref={mentionAnchorRef} className="relative mx-auto w-full min-w-0 max-w-3xl">
				{isMentionMenuOpen && mentionMenuStyle
					? createPortal(
							<DocumentMentionMenu
								documents={filteredDocuments}
								selectedIndex={selectedIndex}
								onSelect={(document) => insertMention(document.title)}
								style={mentionMenuStyle}
							/>,
							document.body,
						)
					: null}

				<div
					className={cn(
						'flex items-end gap-2 rounded-2xl border border-border/60 bg-background/50 p-2 shadow-sm',
						isListening ? 'border-primary/50 ring-1 ring-primary/30' : '',
					)}
				>
					<DevStudioAttachMenu
						disabled={inputDisabled}
						onDocumentUpload={(files) => {
							void handleDocumentUploads(files)
						}}
						onImageUpload={(files) => {
							void handleImageUploads(files)
						}}
					/>

					{isSupported ? (
						<Button
							type="button"
							size="icon"
							variant={isListening ? 'default' : 'outline'}
							disabled={isComposerSending || isTranscribing}
							onClick={handleMicPress}
							aria-label="Start voice input"
							className={cn(isListening && 'animate-pulse')}
						>
							<Mic className="h-4 w-4" />
						</Button>
					) : null}

					<textarea
						ref={textareaRef}
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value)
							setCursorPosition(event.target.selectionStart)
							if (!isListening && !isTranscribing) {
								setInputMethod('typed')
							}
						}}
						onClick={syncCursor}
						onKeyUp={syncCursor}
						onKeyDown={handleKeyDown}
						rows={1}
						enterKeyHint="enter"
						placeholder={
							isTranscribing
								? 'Transcribing...'
								: isListening
									? 'Recording...'
									: preferences.geminiApiKey.trim()
										? 'Ask the code agent to inspect, edit, push, or merge PRs...'
										: 'Add your Gemini API key in Settings to chat'
						}
						disabled={inputDisabled}
						readOnly={isListening}
						className="min-h-[2.5rem] flex-1 resize-none overflow-hidden bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
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
								onClick={handleContinueSpeech}
								className="shrink-0"
							>
								Continue
							</Button>
						</>
					) : isComposerSending ? (
						<Button
							type="button"
							size="icon"
							variant="secondary"
							onClick={handleStop}
							aria-label="Stop generation"
						>
							<Square className="h-4 w-4" />
						</Button>
					) : (
						<Button
							type="button"
							size="icon"
							onClick={() => void handleSubmit()}
							disabled={!draft.trim() && attachments.length === 0}
							aria-label="Send message"
						>
							<ArrowUp className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
