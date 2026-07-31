import { Loader2 } from 'lucide-react'
import { useWidgetSettings } from '@/widgets/registry'
import { cn } from '@/utils/cn'

interface CalendarSettings {
	view: 'day' | 'week' | 'month'
}

const DEFAULT_SETTINGS: CalendarSettings = {
	view: 'week',
}

const PLACEHOLDER_EVENTS = [
	{ time: '09:00', title: 'Focus block', duration: '2h' },
	{ time: '13:30', title: 'Team sync', duration: '30m' },
	{ time: '16:00', title: 'Review notes', duration: '45m' },
]

export function CalendarWidget({ instanceId }: { instanceId: string }) {
	const { settings, isLoading } = useWidgetSettings<CalendarSettings>(
		instanceId,
		DEFAULT_SETTINGS,
	)

	return (
		<div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
			<div className="widget-drag-handle flex items-center justify-between gap-2 border-b border-border px-3 py-2">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
						Calendar
					</p>
					<p className="text-[10px] text-muted-foreground">{settings.view} view</p>
				</div>
				<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
					Today
				</span>
			</div>

			<div className="min-h-0 flex-1 overflow-auto p-2.5">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<Loader2 className="size-5 animate-spin text-primary" />
					</div>
				) : (
					<ul className="space-y-1">
						{PLACEHOLDER_EVENTS.map((event, index) => (
							<li
								key={event.title}
								className={cn(
									'grid grid-cols-[2.75rem_1fr_auto] items-center gap-2 rounded-md px-1 py-1',
									index === 0 && 'bg-primary/5',
								)}
							>
								<span className="text-[11px] font-mono tabular-nums text-primary">
									{event.time}
								</span>
								<div className="min-w-0 border-l border-primary/30 pl-2">
									<p className="truncate text-sm text-foreground">{event.title}</p>
								</div>
								<span className="text-[10px] text-muted-foreground">{event.duration}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
