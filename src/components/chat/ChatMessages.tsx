import { Bot, Loader2, User } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { MessageActions } from '@/components/chat/MessageActions'
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

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
	}, [messages, isGenerating])

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
			<ScrollArea className="h-full">
				<div className="mx-auto w-full max-w-3xl px-4 py-2 md:px-6">
					{messages.map((message) => (
						<MessageRow
							key={message.id}
							message={message}
							aiName={aiName}
							onConfirmDelete={onConfirmDelete}
							onCancelDelete={onCancelDelete}
						/>
					))}
					{isGenerating ? (
						<div className="flex items-center gap-3 border-t border-border/40 py-6 text-sm text-muted-foreground">
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

function MessageRow({
	message,
	aiName,
	onConfirmDelete,
	onCancelDelete,
}: {
	message: StoredMessage
	aiName: string
	onConfirmDelete: ChatMessagesProps['onConfirmDelete']
	onCancelDelete: ChatMessagesProps['onCancelDelete']
}) {
	const contentRef = useRef<HTMLDivElement>(null)
	const isUser = message.role === 'user'

	return (
		<article
			className={cn(
				'border-b border-border/40 py-5 last:border-b-0',
				isUser ? 'flex justify-end' : 'flex justify-start',
			)}
		>
			<div
				className={cn(
					'flex w-full gap-3 md:gap-4',
					isUser ? 'max-w-[88%] flex-row-reverse' : 'max-w-full',
				)}
			>
				<MessageAvatar isUser={isUser} aiName={aiName} />

				<div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
					<p className="mb-1.5 text-xs font-medium text-muted-foreground">
						{isUser ? 'You' : aiName}
					</p>

					<div
						className={cn(
							'w-full',
							isUser &&
								'max-w-full rounded-[1.25rem] bg-secondary px-4 py-3 ring-1 ring-border/60',
						)}
					>
						<div
							ref={contentRef}
							tabIndex={-1}
							className={cn(
								'chat-message-content outline-none',
								isUser
									? 'text-sm leading-relaxed whitespace-pre-wrap'
									: 'text-[0.9375rem] leading-7',
							)}
						>
							{isUser ? (
								message.content
							) : (
								<ChatMarkdown content={message.content} />
							)}
						</div>

						{message.media?.map((media, index) => (
							<MediaPreview
								key={`${message.id}-media-${index}`}
								media={media}
								className={index === 0 ? 'mt-4' : 'mt-3'}
							/>
						))}

						{message.pendingDeleteConfirmation ? (
							<div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
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

					<MessageActions
						contentRef={contentRef}
						text={message.content}
						className={cn('mt-2', isUser && 'justify-end')}
					/>
				</div>
			</div>
		</article>
	)
}

function MessageAvatar({
	isUser,
	aiName,
}: {
	isUser: boolean
	aiName: string
}) {
	return (
		<div
			className={cn(
				'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
				isUser
					? 'bg-secondary text-secondary-foreground ring-1 ring-border'
					: 'bg-primary/15 text-primary',
			)}
			aria-hidden
			title={isUser ? 'You' : aiName}
		>
			{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
		</div>
	)
}

function MediaPreview({
	media,
	className,
}: {
	media: NonNullable<StoredMessage['media']>[number]
	className?: string
}) {
	if (media.type === 'image') {
		return (
			<img
				src={media.dataUrl}
				alt="Generated"
				className={cn(
					'max-h-64 w-full rounded-xl object-contain ring-1 ring-border md:max-h-96',
					className,
				)}
			/>
		)
	}

	if (media.type === 'audio') {
		return <audio controls src={media.dataUrl} className={cn('w-full', className)} />
	}

	return (
		<video
			controls
			src={media.dataUrl}
			className={cn(
				'max-h-64 w-full rounded-xl ring-1 ring-border md:max-h-96',
				className,
			)}
		/>
	)
}
