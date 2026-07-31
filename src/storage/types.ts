export const STORAGE_STORES = {
	LAYOUTS: 'layouts',
	WIDGET_SETTINGS: 'widget-settings',
	PREFERENCES: 'preferences',
	CACHE: 'cache',
	NOTES: 'notes',
} as const

export type StorageStoreName = typeof STORAGE_STORES[keyof typeof STORAGE_STORES]

export const STORAGE_KEYS = {
	DASHBOARD_LAYOUT: 'dashboard-layout',
	DASHBOARD_INSTANCES: 'dashboard-instances',
	DASHBOARD_PREFERENCES: 'dashboard-preferences',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string
