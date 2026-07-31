import { useCallback } from 'react'
import type { Layout } from 'react-grid-layout/legacy'
import { useStorageValue } from '@/storage/hooks/useStorageValue'
import { STORAGE_KEYS, STORAGE_STORES } from '@/storage/types'
import type { DashboardLayouts, WidgetInstance } from '@/types/widget'
import {
	createWidgetInstance,
	getDefaultLayoutItem,
	getWidgetDefinition,
} from '@/widgets/registry'

interface DashboardState {
	instances: WidgetInstance[]
	layouts: DashboardLayouts
}

const DEFAULT_INSTANCES: WidgetInstance[] = [
	{ id: 'weather-default', type: 'weather' },
	{ id: 'calendar-default', type: 'calendar' },
	{ id: 'notes-default', type: 'notes' },
]

function buildLayoutForBreakpoint(
	breakpoint: 'lg' | 'md' | 'sm' | 'xs' | 'xxs',
): Layout {
	const weather = getWidgetDefinition('weather')
	const calendar = getWidgetDefinition('calendar')
	const notes = getWidgetDefinition('notes')

	const layouts: Record<string, Layout> = {
		lg: [
			{
				i: 'weather-default',
				x: 0,
				y: 0,
				w: 5,
				h: 2,
				minW: weather?.minSize?.w ?? 3,
				minH: weather?.minSize?.h ?? 2,
			},
			{
				i: 'calendar-default',
				x: 5,
				y: 0,
				w: 7,
				h: 3,
				minW: calendar?.minSize?.w ?? 4,
				minH: calendar?.minSize?.h ?? 2,
			},
			{
				i: 'notes-default',
				x: 0,
				y: 2,
				w: 5,
				h: 3,
				minW: notes?.minSize?.w ?? 3,
				minH: notes?.minSize?.h ?? 2,
			},
		],
		md: [
			{
				i: 'weather-default',
				x: 0,
				y: 0,
				w: 5,
				h: 2,
				minW: 3,
				minH: 2,
			},
			{
				i: 'calendar-default',
				x: 5,
				y: 0,
				w: 5,
				h: 3,
				minW: 4,
				minH: 2,
			},
			{
				i: 'notes-default',
				x: 0,
				y: 2,
				w: 5,
				h: 3,
				minW: 3,
				minH: 2,
			},
		],
		sm: [
			{ i: 'weather-default', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
			{ i: 'calendar-default', x: 3, y: 0, w: 3, h: 3, minW: 3, minH: 2 },
			{ i: 'notes-default', x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
		],
		xs: [
			{ i: 'weather-default', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
			{ i: 'calendar-default', x: 2, y: 0, w: 2, h: 3, minW: 2, minH: 2 },
			{ i: 'notes-default', x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
		],
		xxs: [
			{ i: 'weather-default', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
			{ i: 'calendar-default', x: 0, y: 2, w: 2, h: 3, minW: 2, minH: 2 },
			{ i: 'notes-default', x: 0, y: 5, w: 2, h: 3, minW: 2, minH: 2 },
		],
	}

	return layouts[breakpoint]
}

function buildDefaultLayouts(): DashboardLayouts {
	return {
		lg: buildLayoutForBreakpoint('lg'),
		md: buildLayoutForBreakpoint('md'),
		sm: buildLayoutForBreakpoint('sm'),
		xs: buildLayoutForBreakpoint('xs'),
		xxs: buildLayoutForBreakpoint('xxs'),
	}
}

const DEFAULT_DASHBOARD_STATE: DashboardState = {
	instances: DEFAULT_INSTANCES,
	layouts: buildDefaultLayouts(),
}

export function useDashboardState() {
	const { value, setValue, isLoading, error } = useStorageValue<DashboardState>(
		STORAGE_STORES.LAYOUTS,
		STORAGE_KEYS.DASHBOARD_LAYOUT,
		DEFAULT_DASHBOARD_STATE,
	)

	const setInstances = useCallback(
		async (instances: WidgetInstance[]) => {
			await setValue((current) => ({ ...current, instances }))
		},
		[setValue],
	)

	const setLayouts = useCallback(
		async (layouts: DashboardLayouts) => {
			await setValue((current) => ({ ...current, layouts }))
		},
		[setValue],
	)

	const addWidget = useCallback(
		async (type: string) => {
			const instance = createWidgetInstance(type)
			if (!instance) {
				return
			}

			const layoutItem = getDefaultLayoutItem(instance)
			if (!layoutItem) {
				return
			}

			await setValue((current) => {
				const nextInstances = [...current.instances, instance]
				const nextLayouts: DashboardLayouts = {}

				for (const [breakpoint, layout] of Object.entries(current.layouts)) {
					nextLayouts[breakpoint] = [...(layout ?? []), layoutItem]
				}

				return {
					instances: nextInstances,
					layouts: nextLayouts,
				}
			})
		},
		[setValue],
	)

	const removeWidget = useCallback(
		async (instanceId: string) => {
			await setValue((current) => {
				const nextInstances = current.instances.filter((instance) => instance.id !== instanceId)
				const nextLayouts: DashboardLayouts = {}

				for (const [breakpoint, layout] of Object.entries(current.layouts)) {
					nextLayouts[breakpoint] = (layout ?? []).filter((item) => item.i !== instanceId)
				}

				return {
					instances: nextInstances,
					layouts: nextLayouts,
				}
			})
		},
		[setValue],
	)

	const setWidgetHidden = useCallback(
		async (instanceId: string, hidden: boolean) => {
			await setValue((current) => ({
				...current,
				instances: current.instances.map((instance) =>
					instance.id === instanceId ? { ...instance, hidden } : instance,
				),
			}))
		},
		[setValue],
	)

	return {
		instances: value.instances,
		layouts: value.layouts,
		setInstances,
		setLayouts,
		addWidget,
		removeWidget,
		setWidgetHidden,
		isLoading,
		error,
	}
}
