import { CloudSun } from 'lucide-react'
import type { WidgetDefinition } from '@/types/widget'
import { WeatherWidget } from './WeatherWidget'

export const weatherWidget: WidgetDefinition = {
	type: 'weather',
	name: 'Weather',
	description: 'Local conditions and forecast',
	icon: CloudSun,
	defaultSize: { w: 5, h: 2 },
	minSize: { w: 3, h: 2 },
	component: WeatherWidget,
	defaultSettings: {
		location: 'Local',
		unit: 'celsius',
	},
}
