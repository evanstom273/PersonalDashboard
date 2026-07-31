import { useWidgetStorage } from '@/storage/hooks/useWidgetStorage'
import type { WidgetDefinition, WidgetInstance } from '@/types/widget'
import { calendarWidget } from './calendar'
import { notesWidget } from './notes'
import { weatherWidget } from './weather'

const widgetDefinitions: WidgetDefinition[] = [
	weatherWidget,
	calendarWidget,
	notesWidget,
]

const widgetMap = new Map(
	widgetDefinitions.map((definition) => [definition.type, definition]),
)

export function getAllWidgets(): WidgetDefinition[] {
	return [...widgetDefinitions]
}

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
	return widgetMap.get(type)
}

export function createWidgetInstance(type: string): WidgetInstance | null {
	const definition = getWidgetDefinition(type)
	if (!definition) {
		return null
	}

	return {
		id: crypto.randomUUID(),
		type,
	}
}

export function getDefaultLayoutItem(instance: WidgetInstance) {
	const definition = getWidgetDefinition(instance.type)
	if (!definition) {
		return null
	}

	return {
		i: instance.id,
		x: 0,
		y: Infinity,
		w: definition.defaultSize.w,
		h: definition.defaultSize.h,
		minW: definition.minSize?.w,
		minH: definition.minSize?.h,
	}
}

export function useWidgetSettings<T>(
	instanceId: string,
	defaultSettings: T,
): {
	settings: T
	setSettings: (next: T | ((current: T) => T)) => Promise<void>
	isLoading: boolean
	error: Error | null
} {
	const { value, setValue, isLoading, error } = useWidgetStorage(
		instanceId,
		'settings',
		defaultSettings,
	)

	return {
		settings: value,
		setSettings: setValue,
		isLoading,
		error,
	}
}
