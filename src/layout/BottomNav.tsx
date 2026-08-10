import { Home, LayoutGrid, MessageSquare, Settings } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useChatGenerationContext } from '@/providers/ChatProvider'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
	{ to: '/home', label: 'Home', icon: Home, end: true },
	{ to: '/chat', label: 'Chat', icon: MessageSquare, end: true },
	{ to: '/library', label: 'Library', icon: LayoutGrid, end: false },
	{ to: '/settings', label: 'Settings', icon: Settings, end: true },
] as const

export function BottomNav() {
	const { isGenerating } = useChatGenerationContext()
	const location = useLocation()
	const isChatActive = location.pathname === '/chat'

	return (
		<nav
			className="bottom-nav shrink-0 border-t border-border/80 bg-card/95 backdrop-blur-md"
			aria-label="Main navigation"
		>
			<div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
				{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
					<NavLink
						key={to}
						to={to}
						end={end}
						className={({ isActive }) =>
							cn(
								'flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.6875rem] font-medium transition-colors',
								isActive
									? 'text-primary'
									: 'text-muted-foreground hover:text-foreground',
							)
						}
					>
						<span className="relative">
							<Icon className="h-5 w-5" strokeWidth={isChatActive && to === '/chat' ? 2.25 : 2} />
							{isGenerating && to === '/chat' && !isChatActive ? (
								<span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
								</span>
							) : null}
						</span>
						<span>{label}</span>
					</NavLink>
				))}
				{isGenerating && !isChatActive ? (
					<span className="sr-only">Chat reply in progress</span>
				) : null}
			</div>
		</nav>
	)
}
