import type { Layout, ResponsiveLayouts } from 'react-grid-layout/legacy'
import type { DashboardLayouts, WidgetInstance } from '@/types/widget'

export function getVisibleInstances(
	instances: WidgetInstance[],
	isEditMode: boolean,
): WidgetInstance[] {
	if (isEditMode) {
		return instances
	}

	return instances.filter((instance) => !instance.hidden)
}

export function filterLayoutsByInstances(
	layouts: DashboardLayouts,
	instances: WidgetInstance[],
): DashboardLayouts {
	const instanceIds = new Set(instances.map((instance) => instance.id))
	const filtered: DashboardLayouts = {}

	for (const [breakpoint, layout] of Object.entries(layouts)) {
		filtered[breakpoint] = (layout ?? []).filter((item) => instanceIds.has(item.i))
	}

	return filtered
}

export function filterLayout(layout: Layout, instanceIds: Set<string>): Layout {
	return layout.filter((item) => instanceIds.has(item.i))
}

export function filterResponsiveLayouts(
	layouts: ResponsiveLayouts,
	instanceIds: Set<string>,
): ResponsiveLayouts {
	const filtered: ResponsiveLayouts = {}

	for (const [breakpoint, layout] of Object.entries(layouts)) {
		if (layout) {
			filtered[breakpoint] = filterLayout(layout, instanceIds)
		}
	}

	return filtered
}
