import { Bot, ExternalLink, FileText, Loader2, Music, User, Video } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { MessageActions } from '@/components/chat/MessageActions'
import { MediaLightbox } from '@/components/media/MediaLightbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MessageDocumentLink, StoredMessage } from '@/storage/types'
import { formatMessageTime } from '@/utils/dateTime'
import { cn } from '@/utils/cn'

interface ChatMessagesProps {
	messages: StoredMessage[]
	streamingAssistant?: {
		id: string
		content: string
	} | null
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
	streamingAssistant,
	isGenerating,
	aiName,
	onConfirmDelete,
	onCancelDelete,
}: ChatMessagesProps) {
	const bottomRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
	}, [messages, isGenerating, streamingAssistant?.content])

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
					{streamingAssistant ? (
						<MessageRow
							message={{
								id: streamingAssistant.id,
								role: 'assistant',
								content: streamingAssistant.content,
								createdAt: Date.now(),
							}}
							aiName={aiName}
							onConfirmDelete={onConfirmDelete}
							onCancelDelete={onCancelDelete}
							isStreaming
						/>
					) : null}
					{isGenerating && !streamingAssistant ? (
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
	isStreaming = false,
}: {
	message: StoredMessage
	aiName: string
	onConfirmDelete: ChatMessagesProps['onConfirmDelete']
	onCancelDelete: ChatMessagesProps['onCancelDelete']
	isStreaming?: boolean
}) {
	const contentRef = useRef<HTMLDivElement>(null)
	const isUser = message.role === 'user'
	const hasMedia = (message.media?.length ?? 0) > 0
	const showMediaFirst = !isUser && hasMedia

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
					<div
						className={cn(
							'mb-1.5 flex flex-wrap items-center gap-2',
							isUser && 'justify-end',
						)}
					>
						<p className="text-xs font-medium text-muted-foreground">
							{isUser ? 'You' : aiName}
						</p>
						<span className="text-xs text-muted-foreground/80">
							{isStreaming ? 'Now' : formatMessageTime(message.createdAt)}
						</span>
					</div>

					<div
						className={cn(
							'w-full',
							isUser &&
								'max-w-full rounded-[1.25rem] bg-secondary px-4 py-3 ring-1 ring-border/60',
						)}
					>
						{showMediaFirst
							? message.media?.map((media, index) => (
									<MediaPreview
										key={`${message.id}-media-${index}`}
										media={media}
										className={index === 0 ? '' : 'mt-3'}
									/>
								))
							: null}

						<div
							ref={contentRef}
							tabIndex={-1}
							className={cn(
								'chat-message-content outline-none',
								isUser
									? 'text-sm leading-relaxed whitespace-pre-wrap'
									: 'text-[0.9375rem] leading-7',
								showMediaFirst && message.content.trim() ? 'mt-4' : '',
								isUser && hasMedia && message.content.trim() ? 'mb-3' : '',
							)}
						>
							{isUser ? (
								message.content
							) : message.content ? (
								<ChatMarkdown content={message.content} />
							) : isStreaming ? (
								<span className="inline-flex items-center gap-2 text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Thinking…
								</span>
							) : null}
						</div>

						{!showMediaFirst
							? message.media?.map((media, index) => (
									<MediaPreview
										key={`${message.id}-media-${index}`}
										media={media}
										className={index === 0 ? (isUser ? '' : 'mt-4') : 'mt-3'}
									/>
								))
							: null}

						{message.documentLinks?.map((link) => (
							<DocumentLinkCard
								key={`${message.id}-doc-${link.id}`}
								link={link}
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

					{!isStreaming ? (
						<MessageActions
							contentRef={contentRef}
							text={message.content}
							className={cn('mt-2', isUser && 'justify-end')}
						/>
					) : null}
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

function DocumentLinkCard({
	link,
	className,
}: {
	link: MessageDocumentLink
	className?: string
}) {
	return (
		<Link
			to={`/library/documents/${link.id}`}
			className={cn(
				'mt-3 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary/70',
				className,
			)}
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
				<FileText className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{link.title}</p>
				<p className="text-xs text-muted-foreground">
					Document {link.action === 'created' ? 'created' : 'updated'}
				</p>
			</div>
			<span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
				Open
				<ExternalLink className="h-3.5 w-3.5" />
			</span>
		</Link>
	)
}

function MediaPreview({
	media,
	className,
}: {
	media: NonNullable<StoredMessage['media']>[number]
	className?: string
}) {
	const label =
		media.type === 'image' ? 'Image' : media.type === 'audio' ? 'Music' : 'Video'
	const Icon = media.type === 'audio' ? Music : media.type === 'video' ? Video : null

	return (
		<div className={cn('min-w-0 overflow-hidden rounded-xl ring-1 ring-border', className)}>
			<div className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-3 py-2 text-xs font-medium text-muted-foreground">
				{Icon ? <Icon className="h-3.5 w-3.5" /> : null}
				{label}
			</div>
			<div className="min-w-0 overflow-hidden bg-background p-2">
				{media.type === 'image' ? (
					<MediaLightbox
						kind="image"
						src={media.dataUrl}
						alt="Generated image"
						className="ring-0"
					/>
				) : media.type === 'audio' ? (
					<audio controls src={media.dataUrl} className="w-full max-w-full" />
				) : (
					<MediaLightbox
						kind="video"
						src={media.dataUrl}
						alt="Generated video"
						className="ring-0"
					/>
				)}
			</div>
		</div>
	)
}
