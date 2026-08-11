import { useEffect, useRef } from 'react'
import { DevStudioComposer } from '@/components/devStudio/DevStudioComposer'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { cn } from '@/utils/cn'

export function DevStudioChatPane({ className }: { className?: string }) {
	const { messages, streamingAssistant, isComposerSending } = useDevStudio()
	const scrollRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const node = scrollRef.current
		if (!node) {
			return
		}
		node.scrollTop = node.scrollHeight
	}, [messages, streamingAssistant])

	return (
		<section className={cn('flex min-h-0 flex-1 flex-col', className)}>
			<div
				ref={scrollRef}
				className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5"
			>
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
					{messages.map((message) => {
						const isStreamingEmpty =
							isComposerSending &&
							message.role === 'assistant' &&
							!message.content &&
							streamingAssistant

						return (
							<div
								key={message.id}
								className={cn(
									'rounded-2xl px-4 py-3 text-sm leading-relaxed',
									message.role === 'user'
										? 'ml-8 bg-primary/15 text-foreground'
										: 'mr-4 border border-border/60 bg-background/40 text-foreground',
								)}
							>
								<p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
									{message.role === 'user' ? 'You' : 'Agent'}
								</p>
								<p className="whitespace-pre-wrap">
									{message.content ||
										(isStreamingEmpty ? streamingAssistant : '')}
								</p>
							</div>
						)
					})}
				</div>
			</div>
			<DevStudioComposer />
		</section>
	)
}
