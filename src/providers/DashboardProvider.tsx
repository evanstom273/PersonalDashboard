import { createContext, useContext, type ReactNode } from 'react'
import { useDashboardState } from '@/hooks/useDashboardState'
import type { DashboardLayouts, WidgetInstance } from '@/types/widget'

interface DashboardContextValue {
	instances: WidgetInstance[]
	layouts: DashboardLayouts
	setLayouts: (layouts: DashboardLayouts) => Promise<void>
	addWidget: (type: string) => Promise<void>
	removeWidget: (instanceId: string) => Promise<void>
	setWidgetHidden: (instanceId: string, hidden: boolean) => Promise<void>
	isLoading: boolean
	error: Error | null
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
	const dashboardState = useDashboardState()

	return (
		<DashboardContext.Provider value={dashboardState}>
			{children}
		</DashboardContext.Provider>
	)
}

export function useDashboard() {
	const context = useContext(DashboardContext)
	if (!context) {
		throw new Error('useDashboard must be used within a DashboardProvider')
	}

	return context
}
