import { useCallback } from 'react'
import type { Layout } from 'react-grid-layout/legacy'
import { useDashboard } from '@/providers/DashboardProvider'
import type { DashboardLayouts } from '@/types/widget'

export function useDashboardLayout() {
	const {
		instances,
		layouts,
		setLayouts,
		addWidget,
		removeWidget,
		setWidgetHidden,
		isLoading,
		error,
	} = useDashboard()

	const onLayoutChange = useCallback(
		async (_currentLayout: Layout, allLayouts: DashboardLayouts) => {
			await setLayouts(allLayouts)
		},
		[setLayouts],
	)

	return {
		instances,
		layouts,
		onLayoutChange,
		addWidget,
		removeWidget,
		setWidgetHidden,
		isLoading,
		error,
	}
}
