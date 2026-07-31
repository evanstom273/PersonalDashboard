import {
	LayoutDashboard,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
} from 'lucide-react'
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences'
import { useEditMode } from '@/providers/EditModeProvider'
import { cn } from '@/utils/cn'
import { getAllWidgets } from '@/widgets/registry'

interface SidebarProps {
	onAddWidget: (type: string) => void
	iconOnly?: boolean
	className?: string
}

export function Sidebar({ onAddWidget, iconOnly = false, className }: SidebarProps) {
	const { preferences, setPreferences } = useDashboardPreferences()
	const { isEditMode } = useEditMode()
	const widgets = getAllWidgets()
	const collapsed = iconOnly || preferences.sidebarCollapsed

	return (
		<aside
			className={cn(
				'flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
				collapsed ? 'w-[4.5rem]' : 'w-60',
				className,
			)}
		>
			<div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3">
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

					{isEditMode ? (
						collapsed ? (
							<div className="mt-3">
								<DropdownMenu>
									<Tooltip>
										<TooltipTrigger asChild>
											<DropdownMenuTrigger asChild>
												<Button variant="outline" size="icon" className="w-full">
													<Plus className="size-4" />
												</Button>
											</DropdownMenuTrigger>
										</TooltipTrigger>
										<TooltipContent side="right">Add widget</TooltipContent>
									</Tooltip>
									<DropdownMenuContent side="right" align="start" className="w-52">
										<DropdownMenuLabel>Widget library</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{widgets.map((widget) => {
											const Icon = widget.icon
											return (
												<DropdownMenuItem
													key={widget.type}
													onClick={() => onAddWidget(widget.type)}
												>
													<Icon className="size-4 text-primary" />
													{widget.name}
												</DropdownMenuItem>
											)
										})}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						) : (
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
						)
					) : null}
				</div>
			</div>

			{!iconOnly ? (
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
			) : null}
		</aside>
	)
}

export function MobileNav({ onAddWidget }: { onAddWidget: (type: string) => void }) {
	const { isEditMode } = useEditMode()
	const widgets = getAllWidgets()

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="md:hidden">
					<Menu className="size-5" />
					<span className="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="pt-12">
				<div className="flex flex-col gap-4 px-4 pb-6">
					<div>
						<p className="text-sm font-semibold">Personal Dashboard</p>
						<p className="text-xs text-muted-foreground">Workspace</p>
					</div>
					<Separator />
					<Button variant="nav-active" size="sm" className="w-full justify-start">
						<LayoutDashboard className="size-4" />
						Dashboard
					</Button>
					{isEditMode ? (
						<>
							<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
											className="w-full justify-start"
											onClick={() => onAddWidget(widget.type)}
										>
											<Icon className="size-4 text-primary" />
											{widget.name}
										</Button>
									)
								})}
							</div>
						</>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	)
}
