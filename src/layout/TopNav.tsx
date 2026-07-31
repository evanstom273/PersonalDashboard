import {
	Bell,
	Check,
	Pencil,
	Plus,
	Search,
	Settings,
	User,
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
import { formatClockTime, useCurrentTime } from '@/hooks/useCurrentTime'
import { MobileNav } from '@/layout/Sidebar'
import { useEditMode } from '@/providers/EditModeProvider'
import { cn } from '@/utils/cn'
import { getAllWidgets } from '@/widgets/registry'

interface TopNavProps {
	onAddWidget: (type: string) => void
}

export function TopNav({ onAddWidget }: TopNavProps) {
	const { isEditMode, toggleEditMode } = useEditMode()
	const widgets = getAllWidgets()
	const now = useCurrentTime()

	return (
		<header className="flex shrink-0 flex-col border-b border-border bg-surface/80 backdrop-blur-md">
			<div className="flex items-center gap-2 px-3 py-2.5 md:gap-3 md:px-5">
				<MobileNav onAddWidget={onAddWidget} />

				<div className="min-w-0 flex-1 md:flex-none">
					<h1 className="text-sm font-semibold tracking-tight text-foreground">Dashboard</h1>
					<p className="hidden text-xs text-muted-foreground sm:block">
						Modular productivity workspace
					</p>
				</div>

				<div className="hidden max-w-xs flex-1 md:flex">
					<label className="relative w-full">
						<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<input
							type="search"
							disabled
							placeholder="Search widgets & data…"
							className="h-8 w-full rounded-md border border-border bg-background/60 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
						/>
					</label>
				</div>

				<div className="flex items-center gap-1 sm:gap-1.5">
					<span
						className="hidden tabular-nums text-xs font-medium text-muted-foreground sm:inline"
						aria-live="polite"
					>
						{formatClockTime(now)}
					</span>

					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-muted-foreground"
						disabled
						aria-label="Notifications (coming soon)"
					>
						<Bell className="size-4" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-muted-foreground"
						disabled
						aria-label="Settings (coming soon)"
					>
						<Settings className="size-4" />
					</Button>

					{isEditMode ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm" variant="outline" className="hidden sm:flex">
									<Plus className="size-4" />
									Add
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
									Widget library
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{widgets.map((widget) => {
									const Icon = widget.icon
									return (
										<DropdownMenuItem
											key={widget.type}
											onClick={() => onAddWidget(widget.type)}
											className="gap-3"
										>
											<Icon className="size-4 text-primary" />
											<div className="min-w-0">
												<p className="font-medium">{widget.name}</p>
												<p className="text-xs text-muted-foreground">{widget.description}</p>
											</div>
										</DropdownMenuItem>
									)
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}

					<Button
						size="sm"
						variant={isEditMode ? 'default' : 'outline'}
						className={cn(isEditMode && 'shadow-[0_0_20px_-6px] shadow-primary/40')}
						onClick={toggleEditMode}
					>
						{isEditMode ? (
							<>
								<Check className="size-4" />
								<span className="hidden sm:inline">Done</span>
							</>
						) : (
							<>
								<Pencil className="size-4" />
								<span className="hidden sm:inline">Edit</span>
							</>
						)}
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8" aria-label="User menu">
								<User className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Account</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem disabled>Profile (soon)</DropdownMenuItem>
							<DropdownMenuItem disabled>Preferences (soon)</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{isEditMode ? (
				<div className="border-t border-primary/20 bg-primary/5 px-3 py-1.5 text-center text-[11px] text-primary md:px-5">
					Edit mode — drag, resize, hide, or remove widgets. Layout saves automatically.
				</div>
			) : null}
		</header>
	)
}
