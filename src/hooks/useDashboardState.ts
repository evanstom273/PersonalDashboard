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

function buildDefaultLayouts(): DashboardLayouts {
	const layout: Layout = DEFAULT_INSTANCES.map((instance, index) => {
		const definition = getWidgetDefinition(instance.type)
		const column = index % 3

		return {
			i: instance.id,
			x: column * 4,
			y: 0,
			w: definition?.defaultSize.w ?? 4,
			h: definition?.defaultSize.h ?? 4,
			minW: definition?.minSize?.w,
			minH: definition?.minSize?.h,
		}
	})

	return {
		lg: layout,
		md: layout,
		sm: layout,
		xs: layout,
		xxs: layout,
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

	return {
		instances: value.instances,
		layouts: value.layouts,
		setInstances,
		setLayouts,
		addWidget,
		removeWidget,
		isLoading,
		error,
	}
}
