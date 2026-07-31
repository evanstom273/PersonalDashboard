import {
	clearStorageStore,
	deleteStorageItem,
	getAllStorageKeys,
	getStorageItem,
	setStorageItem,
} from './db'
import { type StorageKey, type StorageStoreName } from './types'

export interface StorageService {
	get<T>(store: StorageStoreName, key: StorageKey): Promise<T | null>
	set<T>(store: StorageStoreName, key: StorageKey, value: T): Promise<void>
	delete(store: StorageStoreName, key: StorageKey): Promise<void>
	clear(store: StorageStoreName): Promise<void>
	getAllKeys(store: StorageStoreName): Promise<string[]>
}

export const storageService: StorageService = {
	get: getStorageItem,
	set: setStorageItem,
	delete: deleteStorageItem,
	clear: clearStorageStore,
	getAllKeys: getAllStorageKeys,
}

export function createScopedStorage(store: StorageStoreName) {
	return {
		get: <T>(key: StorageKey) => storageService.get<T>(store, key),
		set: <T>(key: StorageKey, value: T) => storageService.set(store, key, value),
		delete: (key: StorageKey) => storageService.delete(store, key),
		clear: () => storageService.clear(store),
		getAllKeys: () => storageService.getAllKeys(store),
	}
}
