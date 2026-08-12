import { Code2, Home, Library, MessageSquare, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useFoldablePane } from '@/hooks/useFoldablePane'
import { useChatGenerationContext } from '@/providers/ChatProvider'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
	{ to: '/home', label: 'Home', icon: Home, end: true },
	{ to: '/chat', label: 'Chat', icon: MessageSquare, end: true },
	{ to: '/dev-studio', label: 'Dev', icon: Code2, end: true },
	{ to: '/library', label: 'Library', icon: Library, end: false },
	{ to: '/settings', label: 'Settings', icon: Settings, end: true },
] as const

export function BottomNav() {
	const { isGenerating } = useChatGenerationContext()
	const { isDualPaneActive, openInSecondaryPane, pane2Route } = useFoldablePane()

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
		if (isDualPaneActive && (to === '/dev-studio' || to === '/library')) {
			e.preventDefault()
			openInSecondaryPane(to)
		}
	}

	return (
		<div className="bottom-nav-dock shrink-0">
			<nav className="bottom-nav-island" aria-label="Main navigation">
				{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
					const isSecondaryActive = isDualPaneActive && pane2Route.startsWith(to)
					return (
						<NavLink
							key={to}
							to={to}
							end={end}
							onClick={(e) => handleClick(e, to)}
							className={({ isActive }) =>
								cn('bottom-nav-item', (isActive || isSecondaryActive) && 'bottom-nav-item-active')
							}
						>
							{({ isActive }) => {
								const active = isActive || isSecondaryActive
								return (
									<>
										<span
											className={cn(
												'bottom-nav-icon-shell',
												active && 'bottom-nav-icon-shell-active',
											)}
										>
											<Icon
												className="h-[1.35rem] w-[1.35rem]"
												strokeWidth={active ? 2.25 : 1.85}
											/>
											{isGenerating && to === '/chat' && !active ? (
												<span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
													<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
													<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
												</span>
											) : null}
										</span>
										<span className="bottom-nav-label">{label}</span>
									</>
								)
							}}
						</NavLink>
					)
				})}
			</nav>
		</div>
	)
}
