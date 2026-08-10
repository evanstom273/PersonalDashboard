import { MessageSquarePlus, Settings, Trash2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { ConversationRecord } from '@/storage/types'
import { cn } from '@/utils/cn'

interface ChatSidebarProps {
	conversations: ConversationRecord[]
	activeConversationId: string | null
	onNewChat: () => void
	onSelectConversation: (id: string) => void
	onDeleteConversation: (id: string) => void
}

export function ChatSidebar({
	conversations,
	activeConversationId,
	onNewChat,
	onSelectConversation,
	onDeleteConversation,
}: ChatSidebarProps) {
	const location = useLocation()

	return (
		<aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:w-72">
			<div className="flex items-center gap-2 px-4 py-4">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
					<MessageSquarePlus className="h-4 w-4" />
				</div>
				<div>
					<p className="font-semibold">Gemini Chat</p>
					<p className="text-xs text-muted-foreground">Bring your own key</p>
				</div>
			</div>

			<div className="px-3 pb-3">
				<Button className="w-full justify-start gap-2" onClick={onNewChat}>
					<MessageSquarePlus className="h-4 w-4" />
					New chat
				</Button>
			</div>

			<Separator />

			<ScrollArea className="flex-1 px-2 py-3">
				<div className="space-y-1">
					{conversations.length === 0 ? (
						<p className="px-3 py-2 text-xs text-muted-foreground">
							No conversations yet
						</p>
					) : (
						conversations.map((conversation) => (
							<div
								key={conversation.id}
								className={cn(
									'group flex items-center gap-1 rounded-lg',
									activeConversationId === conversation.id && location.pathname === '/'
										? 'bg-sidebar-accent'
										: 'hover:bg-sidebar-accent/70',
								)}
							>
								<button
									type="button"
									onClick={() => onSelectConversation(conversation.id)}
									className="flex-1 truncate px-3 py-2 text-left text-sm"
								>
									{conversation.title}
								</button>
								<Button
									variant="ghost"
									size="icon"
									className="mr-1 h-8 w-8 opacity-0 group-hover:opacity-100"
									onClick={() => onDeleteConversation(conversation.id)}
									aria-label={`Delete ${conversation.title}`}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))
					)}
				</div>
			</ScrollArea>

			<Separator />

			<div className="p-3">
				<Button
					asChild
					variant={location.pathname === '/settings' ? 'secondary' : 'ghost'}
					className="w-full justify-start gap-2"
				>
					<Link to="/settings">
						<Settings className="h-4 w-4" />
						Settings
					</Link>
				</Button>
			</div>
		</aside>
	)
}
