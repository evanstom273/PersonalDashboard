import { Link, useLocation } from 'react-router-dom'
import { Brain, LayoutGrid, Loader2, MessageSquare, Settings, Sparkles } from 'lucide-react'
import { useChatGenerationContext, usePreferencesContext } from '@/providers/ChatProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { cn } from '@/utils/cn'

interface AppNavProps {
	onNavigate?: () => void
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
	cn(
		'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
		isActive
			? 'bg-sidebar-accent text-sidebar-foreground'
			: 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
	)

export function AppNav({ onNavigate }: AppNavProps) {
	const { preferences } = usePreferencesContext()
	const { isGenerating } = useChatGenerationContext()
	const aiName = getConfiguredAiName(preferences)
	const location = useLocation()

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center gap-3 px-4 py-5">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
					<Sparkles className="h-5 w-5" />
				</div>
				<div>
					<p className="font-semibold">{aiName}</p>
					<p className="text-xs text-muted-foreground">Bring your own key</p>
				</div>
			</div>

			<nav className="flex flex-col gap-1 px-3 py-2">
				<Link
					to="/"
					className={navLinkClass({ isActive: location.pathname === '/' })}
					onClick={onNavigate}
				>
					<MessageSquare className="h-4 w-4" />
					<span className="flex-1">Chat</span>
					{isGenerating && location.pathname !== '/' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
					) : null}
				</Link>
				<Link
					to="/library"
					className={navLinkClass({
						isActive: location.pathname.startsWith('/library'),
					})}
					onClick={onNavigate}
				>
					<LayoutGrid className="h-4 w-4" />
					Library
				</Link>
				<Link
					to="/memory"
					className={navLinkClass({
						isActive: location.pathname.startsWith('/memory'),
					})}
					onClick={onNavigate}
				>
					<Brain className="h-4 w-4" />
					Memory
				</Link>
				<Link
					to="/settings"
					className={navLinkClass({ isActive: location.pathname === '/settings' })}
					onClick={onNavigate}
				>
					<Settings className="h-4 w-4" />
					Settings
				</Link>
			</nav>
		</div>
	)
}
