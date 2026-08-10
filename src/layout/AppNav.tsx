import { Home, Settings, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
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
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center gap-3 px-4 py-5">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
					<Sparkles className="h-5 w-5" />
				</div>
				<div>
					<p className="font-semibold">Gemini Chat</p>
					<p className="text-xs text-muted-foreground">Bring your own key</p>
				</div>
			</div>

			<nav className="flex flex-col gap-1 px-3 py-2">
				<NavLink to="/" end className={navLinkClass} onClick={onNavigate}>
					<Home className="h-4 w-4" />
					Home
				</NavLink>
				<NavLink to="/settings" className={navLinkClass} onClick={onNavigate}>
					<Settings className="h-4 w-4" />
					Settings
				</NavLink>
			</nav>
		</div>
	)
}
