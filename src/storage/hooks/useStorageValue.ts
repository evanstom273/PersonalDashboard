import { useCallback, useEffect, useState } from 'react'
import { storageService } from '../storageService'
import { type StorageKey, type StorageStoreName } from '../types'

interface UseStorageValueResult<T> {
	value: T
	setValue: (next: T | ((current: T) => T)) => Promise<void>
	isLoading: boolean
	error: Error | null
}

export function useStorageValue<T>(
	store: StorageStoreName,
	key: StorageKey,
	defaultValue: T,
): UseStorageValueResult<T> {
	const [value, setValueState] = useState<T>(defaultValue)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		let cancelled = false

		async function load() {
			setIsLoading(true)
			setError(null)

			try {
				const stored = await storageService.get<T>(store, key)
				if (!cancelled) {
					setValueState(stored ?? defaultValue)
				}
			} catch (loadError) {
				if (!cancelled) {
					setError(loadError instanceof Error ? loadError : new Error('Failed to load storage value'))
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false)
				}
			}
		}

		load()

		return () => {
			cancelled = true
		}
	}, [store, key, defaultValue])

	const setValue = useCallback(
		async (next: T | ((current: T) => T)) => {
			const resolved = typeof next === 'function'
				? (next as (current: T) => T)(value)
				: next

			setValueState(resolved)
			setError(null)

			try {
				await storageService.set(store, key, resolved)
			} catch (saveError) {
				setError(saveError instanceof Error ? saveError : new Error('Failed to save storage value'))
				throw saveError
			}
		},
		[store, key, value],
	)

	return { value, setValue, isLoading, error }
}
