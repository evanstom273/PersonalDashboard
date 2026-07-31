import { CloudSun } from 'lucide-react'
import type { WidgetDefinition } from '@/types/widget'
import { WeatherWidget } from './WeatherWidget'

export const weatherWidget: WidgetDefinition = {
	type: 'weather',
	name: 'Weather',
	description: 'Local conditions and forecast',
	icon: CloudSun,
	defaultSize: { w: 4, h: 5 },
	minSize: { w: 3, h: 4 },
	component: WeatherWidget,
	defaultSettings: {
		location: 'Local',
		unit: 'celsius',
	},
}
