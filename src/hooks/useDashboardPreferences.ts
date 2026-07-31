import { useStorageValue } from '@/storage/hooks/useStorageValue'
import { STORAGE_KEYS, STORAGE_STORES } from '@/storage/types'
import {
	DEFAULT_DASHBOARD_PREFERENCES,
	type DashboardPreferences,
} from '@/types/dashboard'

export function useDashboardPreferences() {
	const { value, setValue, isLoading, error } = useStorageValue<DashboardPreferences>(
		STORAGE_STORES.PREFERENCES,
		STORAGE_KEYS.DASHBOARD_PREFERENCES,
		DEFAULT_DASHBOARD_PREFERENCES,
	)

	return {
		preferences: value,
		setPreferences: setValue,
		isLoading,
		error,
	}
}
