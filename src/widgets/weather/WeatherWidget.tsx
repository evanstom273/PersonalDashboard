import { CloudSun, Loader2 } from 'lucide-react'
import { useWidgetSettings } from '@/widgets/registry'
import { cn } from '@/utils/cn'

interface WeatherSettings {
	location: string
	unit: 'celsius' | 'fahrenheit'
}

const DEFAULT_SETTINGS: WeatherSettings = {
	location: 'Local',
	unit: 'celsius',
}

export function WeatherWidget({ instanceId }: { instanceId: string }) {
	const { settings, isLoading } = useWidgetSettings<WeatherSettings>(
		instanceId,
		DEFAULT_SETTINGS,
	)

	const temp = settings.unit === 'celsius' ? 18 : 64
	const high = settings.unit === 'celsius' ? 22 : 72
	const low = settings.unit === 'celsius' ? 14 : 57
	const unitLabel = settings.unit === 'celsius' ? '°' : '°'

	return (
		<div
			className={cn(
				'flex h-full flex-col overflow-hidden rounded-lg border border-border',
				'bg-gradient-to-br from-card via-card to-primary/5',
			)}
		>
			<div className="widget-drag-handle flex h-5 shrink-0 items-center px-2.5">
				<div className="h-0.5 w-6 rounded-full bg-primary/25" />
			</div>

			{isLoading ? (
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="size-5 animate-spin text-primary" />
				</div>
			) : (
				<div className="flex min-h-0 flex-1 flex-col px-3 pb-2.5">
					<div className="flex items-center justify-between gap-2">
						<CloudSun
							className="size-9 shrink-0 text-primary/90"
							strokeWidth={1.25}
							aria-hidden
						/>
						<div className="min-w-0 text-right">
							<p className="text-3xl font-semibold leading-none tracking-tight text-primary tabular-nums">
								{temp}{unitLabel}
							</p>
							<p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
								{settings.location}
							</p>
						</div>
					</div>
					<div className="mt-auto flex justify-between pt-1 text-[10px] tabular-nums text-muted-foreground">
						<span>H {high}{unitLabel}</span>
						<span>L {low}{unitLabel}</span>
					</div>
				</div>
			)}
		</div>
	)
}
