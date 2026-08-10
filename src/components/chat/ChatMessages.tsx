import { Bot, Check, Copy, Loader2, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StoredMessage } from '@/storage/types'
import { cn } from '@/utils/cn'

interface ChatMessagesProps {
	messages: StoredMessage[]
	isGenerating: boolean
	aiName: string
	onConfirmDelete: (
		messageId: string,
		documentId: string,
		documentTitle: string,
	) => void
	onCancelDelete: (messageId: string) => void
}

export function ChatMessages({
	messages,
	isGenerating,
	aiName,
	onConfirmDelete,
	onCancelDelete,
}: ChatMessagesProps) {
	const bottomRef = useRef<HTMLDivElement>(null)
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
	}, [messages, isGenerating])

	const handleCopy = useCallback(async (message: StoredMessage) => {
		try {
			await navigator.clipboard.writeText(message.content)
			setCopiedMessageId(message.id)
			window.setTimeout(() => {
				setCopiedMessageId((current) =>
					current === message.id ? null : current,
				)
			}, 2000)
		} catch {
			// Clipboard access can fail in insecure contexts.
		}
	}, [])

	if (messages.length === 0 && !isGenerating) {
		return (
			<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 text-center">
				<div className="max-w-md space-y-3">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Bot className="h-7 w-7" />
					</div>
					<h2 className="text-lg font-semibold">Your conversation</h2>
					<p className="text-sm text-muted-foreground">
						One continuous thread with {aiName}. Switch between Gemini 3.6
						Flash and 3.1 Pro, ask for document help, or try phrases like
						&quot;generate an image of…&quot;, &quot;generate music&quot;, or
						&quot;create a video&quot;.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-0 flex-1 overflow-hidden">
			<ScrollArea className="h-full px-4 md:px-8">
				<div className="mx-auto flex max-w-3xl select-none flex-col gap-6 py-4">
					{messages.map((message) => (
						<MessageBubble
							key={message.id}
							message={message}
							aiName={aiName}
							isCopied={copiedMessageId === message.id}
							onCopy={() => {
								void handleCopy(message)
							}}
							onConfirmDelete={onConfirmDelete}
							onCancelDelete={onCancelDelete}
						/>
					))}
					{isGenerating ? (
						<div className="flex items-center gap-3 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							{aiName} is thinking…
						</div>
					) : null}
					<div ref={bottomRef} />
				</div>
			</ScrollArea>
		</div>
	)
}

function MessageBubble({
	message,
	aiName,
	isCopied,
	onCopy,
	onConfirmDelete,
	onCancelDelete,
}: {
	message: StoredMessage
	aiName: string
	isCopied: boolean
	onCopy: () => void
	onConfirmDelete: ChatMessagesProps['onConfirmDelete']
	onCancelDelete: ChatMessagesProps['onCancelDelete']
}) {
	const isUser = message.role === 'user'

	return (
		<div
			className={cn('flex gap-3 select-none', isUser ? 'justify-end' : 'justify-start')}
		>
			{!isUser ? (
				<div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
					<Bot className="h-4 w-4" />
				</div>
			) : null}
			<div
				className={cn(
					'group relative max-w-[85%] select-text space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed',
					isUser
						? 'bg-secondary text-secondary-foreground ring-1 ring-border'
						: 'bg-card text-card-foreground',
				)}
			>
				<div className="flex items-start justify-between gap-2">
					{!isUser ? (
						<p className="text-xs font-medium text-muted-foreground">{aiName}</p>
					) : (
						<span className="text-xs font-medium text-muted-foreground">You</span>
					)}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={cn(
							'-mr-1 -mt-1 h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
							isCopied && 'opacity-100',
						)}
						onClick={onCopy}
						aria-label={isCopied ? 'Copied message' : 'Copy message'}
					>
						{isCopied ? (
							<Check className="h-3.5 w-3.5" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
					</Button>
				</div>
				<p className="whitespace-pre-wrap">{message.content}</p>
				{message.media?.map((media, index) => (
					<MediaPreview key={`${message.id}-media-${index}`} media={media} />
				))}
				{message.pendingDeleteConfirmation ? (
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
						<p className="text-sm">
							Confirm deletion of &quot;
							{message.pendingDeleteConfirmation.documentTitle}&quot;?
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<Button
								size="sm"
								variant="destructive"
								onClick={() =>
									onConfirmDelete(
										message.id,
										message.pendingDeleteConfirmation!.documentId,
										message.pendingDeleteConfirmation!.documentTitle,
									)
								}
							>
								Delete document
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => onCancelDelete(message.id)}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : null}
			</div>
			{isUser ? (
				<div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
					<User className="h-4 w-4" />
				</div>
			) : null}
		</div>
	)
}

function MediaPreview({
	media,
}: {
	media: NonNullable<StoredMessage['media']>[number]
}) {
	if (media.type === 'image') {
		return (
			<img
				src={media.dataUrl}
				alt="Generated"
				className="max-h-64 w-full rounded-lg object-contain md:max-h-96"
			/>
		)
	}

	if (media.type === 'audio') {
		return <audio controls src={media.dataUrl} className="w-full" />
	}

	return (
		<video
			controls
			src={media.dataUrl}
			className="max-h-64 w-full rounded-lg md:max-h-96"
		/>
	)
}
