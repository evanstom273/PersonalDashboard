import { Bot, Loader2, User } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StoredMessage } from '@/storage/types'
import { cn } from '@/utils/cn'

interface ChatMessagesProps {
	messages: StoredMessage[]
	isGenerating: boolean
}

export function ChatMessages({ messages, isGenerating }: ChatMessagesProps) {
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
						or say &quot;generate image&quot;, &quot;generate music&quot;, or
						&quot;generate video&quot; to create media.
					</p>
				</div>
			</div>
		)
	}

	return (
		<ScrollArea className="flex-1 px-4 md:px-8">
			<div className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
				{messages.map((message) => (
					<MessageBubble key={message.id} message={message} />
				))}
				{isGenerating ? (
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Generating response…
					</div>
				) : null}
			</div>
		</ScrollArea>
	)
}

function MessageBubble({ message }: { message: StoredMessage }) {
	const isUser = message.role === 'user'

	return (
		<div
			className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
		>
			{!isUser ? (
				<div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
					<Bot className="h-4 w-4" />
				</div>
			) : null}
			<div
				className={cn(
					'max-w-[85%] space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed',
					isUser
						? 'bg-secondary text-secondary-foreground ring-1 ring-border'
						: 'bg-card text-card-foreground',
				)}
			>
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
