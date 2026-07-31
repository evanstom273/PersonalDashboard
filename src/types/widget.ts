import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Layout, ResponsiveLayouts } from 'react-grid-layout/legacy'

export interface WidgetSize {
	w: number
	h: number
}

export interface WidgetComponentProps {
	instanceId: string
}

export interface WidgetSettingsProps {
	instanceId: string
}

export interface WidgetDefinition {
	type: string
	name: string
	description: string
	icon: LucideIcon
	defaultSize: WidgetSize
	minSize?: WidgetSize
	component: ComponentType<WidgetComponentProps>
	SettingsComponent?: ComponentType<WidgetSettingsProps>
	defaultSettings?: Record<string, unknown>
}

export interface WidgetInstance {
	id: string
	type: string
	hidden?: boolean
}

export interface DashboardLayouts extends ResponsiveLayouts {
	lg?: Layout
	md?: Layout
	sm?: Layout
	xs?: Layout
	xxs?: Layout
}
