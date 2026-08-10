import { Bot, Check, Copy, Loader2, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StoredMessage } from '@/storage/types'
import { cn } from '@/utils/cn'

interface ChatMessagesProps {
	messages: StoredMessage[]
	isGenerating: boolean
}

export function ChatMessages({ messages, isGenerating }: ChatMessagesProps) {
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
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
				<div className="rounded-full bg-primary/10 p-4 text-primary">
					<Bot className="h-8 w-8" />
				</div>
				<div className="max-w-md space-y-2">
					<h2 className="text-xl font-semibold">Your conversation</h2>
					<p className="text-sm text-muted-foreground">
						One continuous thread. Switch between Gemini 3.6 Flash and 3.1 Pro,
						or try phrases like &quot;generate an image of…&quot;, &quot;generate
						music&quot;, or &quot;create a video&quot;.
					</p>
				</div>
			</div>
		)
	}

	return (
		<ScrollArea className="flex-1 px-4 md:px-8">
			<div className="mx-auto flex max-w-3xl select-none flex-col gap-6 py-6">
				{messages.map((message) => (
					<MessageBubble
						key={message.id}
						message={message}
						isCopied={copiedMessageId === message.id}
						onCopy={() => {
							void handleCopy(message)
						}}
					/>
				))}
				{isGenerating ? (
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Generating response…
					</div>
				) : null}
				<div ref={bottomRef} />
			</div>
		</ScrollArea>
	)
}

function MessageBubble({
	message,
	isCopied,
	onCopy,
}: {
	message: StoredMessage
	isCopied: boolean
	onCopy: () => void
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
				<div className="flex items-start justify-end">
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
				className="max-h-96 w-full rounded-lg object-contain"
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
			className="max-h-96 w-full rounded-lg"
		/>
	)
}
