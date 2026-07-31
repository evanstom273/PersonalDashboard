import { useCallback } from 'react'
import { useStorageValue } from './useStorageValue'
import { STORAGE_STORES } from '../types'

export function useWidgetStorage<T>(
	instanceId: string,
	key: string,
	defaultValue: T,
) {
	const storageKey = `${instanceId}:${key}`
	const { value, setValue, isLoading, error } = useStorageValue(
		STORAGE_STORES.WIDGET_SETTINGS,
		storageKey,
		defaultValue,
	)

	const updateValue = useCallback(
		async (next: T | ((current: T) => T)) => {
			await setValue(next)
		},
		[setValue],
	)

	return {
		value,
		setValue: updateValue,
		isLoading,
		error,
	}
}
