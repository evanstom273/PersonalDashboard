import { Loader2 } from 'lucide-react'
import { WidgetFrame } from '@/components/WidgetFrame'
import { useWidgetSettings } from '@/widgets/registry'

interface CalendarSettings {
	view: 'day' | 'week' | 'month'
}

const DEFAULT_SETTINGS: CalendarSettings = {
	view: 'week',
}

const PLACEHOLDER_EVENTS = [
	{ time: '09:00', title: 'Focus block' },
	{ time: '13:30', title: 'Team sync' },
	{ time: '16:00', title: 'Review notes' },
]

export function CalendarWidget({ instanceId }: { instanceId: string }) {
	const { settings, isLoading } = useWidgetSettings<CalendarSettings>(
		instanceId,
		DEFAULT_SETTINGS,
	)

	return (
		<WidgetFrame
			title="Calendar"
			description={`${settings.view} view · placeholder`}
		>
			{isLoading ? (
				<div className="flex h-full items-center justify-center">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<ul className="space-y-3">
					{PLACEHOLDER_EVENTS.map((event) => (
						<li
							key={event.title}
							className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
						>
							<span className="text-xs font-medium text-primary">{event.time}</span>
							<span className="text-sm text-foreground">{event.title}</span>
						</li>
					))}
				</ul>
			)}
		</WidgetFrame>
	)
}
