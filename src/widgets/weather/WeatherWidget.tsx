import { Loader2 } from 'lucide-react'
import { WidgetFrame } from '@/components/WidgetFrame'
import { useWidgetSettings } from '@/widgets/registry'

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

	return (
		<WidgetFrame
			title="Weather"
			description={`${settings.location} · placeholder`}
		>
			{isLoading ? (
				<div className="flex h-full items-center justify-center">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="flex h-full flex-col justify-between gap-4">
					<div>
						<p className="text-4xl font-semibold tracking-tight text-foreground">
							{settings.unit === 'celsius' ? '18°C' : '64°F'}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">Partly cloudy</p>
					</div>
					<p className="text-xs text-muted-foreground">
						Weather data will connect here later. Settings and storage are wired through the widget system.
					</p>
				</div>
			)}
		</WidgetFrame>
	)
}
