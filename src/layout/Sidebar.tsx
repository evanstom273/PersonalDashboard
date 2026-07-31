import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences'
import { cn } from '@/utils/cn'
import { getAllWidgets } from '@/widgets/registry'

interface SidebarProps {
	onAddWidget: (type: string) => void
	className?: string
}

export function Sidebar({ onAddWidget, className }: SidebarProps) {
	const { preferences, setPreferences } = useDashboardPreferences()
	const widgets = getAllWidgets()
	const collapsed = preferences.sidebarCollapsed

	return (
		<aside
			className={cn(
				'flex h-full shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground transition-[width] duration-200',
				collapsed ? 'w-16' : 'w-64',
				className,
			)}
		>
			<div className="flex h-14 items-center gap-2 px-3">
				<div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
					<LayoutDashboard className="size-4" />
				</div>
				{!collapsed ? (
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold">Personal Dashboard</p>
						<p className="truncate text-xs text-muted-foreground">Workspace</p>
					</div>
				) : null}
			</div>

			<Separator />

			<div className="flex-1 overflow-auto p-3">
				{!collapsed ? (
					<p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Navigation
					</p>
				) : null}
				<nav className="space-y-1">
					<Button
						variant="secondary"
						className={cn('w-full justify-start', collapsed && 'justify-center px-0')}
					>
						<LayoutDashboard className="size-4" />
						{!collapsed ? <span>Dashboard</span> : null}
					</Button>
				</nav>

				{!collapsed ? (
					<>
						<Separator className="my-4" />
						<p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Widget library
						</p>
						<div className="space-y-1">
							{widgets.map((widget) => {
								const Icon = widget.icon
								return (
									<Button
										key={widget.type}
										variant="ghost"
										className="w-full justify-start"
										onClick={() => onAddWidget(widget.type)}
									>
										<Icon className="size-4" />
										<span className="truncate">{widget.name}</span>
									</Button>
								)
							})}
						</div>
					</>
				) : null}
			</div>

			<div className="border-t border-border/60 p-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="w-full"
							onClick={() => {
								setPreferences((current) => ({
									...current,
									sidebarCollapsed: !current.sidebarCollapsed,
								}))
							}}
						>
							{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="right">
						{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					</TooltipContent>
				</Tooltip>
			</div>
		</aside>
	)
}

interface TopNavProps {
	onAddWidget: (type: string) => void
}

export function TopNav({ onAddWidget }: TopNavProps) {
	const widgets = getAllWidgets()

	return (
		<header className="flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm">
			<div>
				<h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
				<p className="text-xs text-muted-foreground">Modular productivity workspace</p>
			</div>

			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm">
							<Plus className="size-4" />
							Add widget
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Available widgets</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{widgets.map((widget) => {
							const Icon = widget.icon
							return (
								<DropdownMenuItem
									key={widget.type}
									onClick={() => onAddWidget(widget.type)}
								>
									<Icon className="size-4" />
									<div>
										<p>{widget.name}</p>
										<p className="text-xs text-muted-foreground">{widget.description}</p>
									</div>
								</DropdownMenuItem>
							)
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	)
}
