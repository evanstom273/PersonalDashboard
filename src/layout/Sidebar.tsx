import { LayoutDashboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
				'flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
				collapsed ? 'w-[4.5rem]' : 'w-60',
				className,
			)}
		>
			<div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3.5">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-[0_0_20px_-6px] shadow-primary/40">
					<LayoutDashboard className="size-4" />
				</div>
				{!collapsed ? (
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold tracking-tight text-foreground">
							Personal Dashboard
						</p>
						<p className="truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
							Workspace
						</p>
					</div>
				) : null}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				<div className="p-3">
					{!collapsed ? (
						<p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
							Navigation
						</p>
					) : null}
					<nav className="space-y-0.5">
						<Button
							variant="nav-active"
							size="sm"
							className={cn('w-full justify-start', collapsed && 'justify-center px-0')}
						>
							<LayoutDashboard className="size-4" />
							{!collapsed ? <span>Dashboard</span> : null}
						</Button>
					</nav>

					{!collapsed ? (
						<>
							<Separator className="my-4 bg-border" />
							<p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
								Widget library
							</p>
							<div className="space-y-0.5">
								{widgets.map((widget) => {
									const Icon = widget.icon
									return (
										<Button
											key={widget.type}
											variant="ghost"
											size="sm"
											className="w-full justify-start text-muted-foreground hover:text-foreground"
											onClick={() => onAddWidget(widget.type)}
										>
											<Icon className="size-4 text-primary/80" />
											<span className="truncate">{widget.name}</span>
										</Button>
									)
								})}
							</div>
						</>
					) : null}
				</div>
			</div>

			<div className="shrink-0 border-t border-border p-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="w-full text-muted-foreground hover:text-primary"
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
