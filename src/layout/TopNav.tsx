import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getAllWidgets } from '@/widgets/registry'

interface TopNavProps {
	onAddWidget: (type: string) => void
}

export function TopNav({ onAddWidget }: TopNavProps) {
	const widgets = getAllWidgets()

	return (
		<header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-md md:px-6">
			<div className="min-w-0">
				<h1 className="text-sm font-semibold tracking-tight text-foreground">Dashboard</h1>
				<p className="text-xs text-muted-foreground">Modular productivity workspace</p>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="sm" className="shadow-[0_0_24px_-8px] shadow-primary/50">
						<Plus className="size-4" />
						Add widget
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
						Available widgets
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
		</header>
	)
}
