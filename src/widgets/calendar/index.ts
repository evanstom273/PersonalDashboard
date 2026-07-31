import { CalendarDays } from 'lucide-react'
import type { WidgetDefinition } from '@/types/widget'
import { CalendarWidget } from './CalendarWidget'

export const calendarWidget: WidgetDefinition = {
	type: 'calendar',
	name: 'Calendar',
	description: 'Upcoming events and schedule',
	icon: CalendarDays,
	defaultSize: { w: 7, h: 3 },
	minSize: { w: 4, h: 2 },
	component: CalendarWidget,
	defaultSettings: {
		view: 'week',
	},
}
