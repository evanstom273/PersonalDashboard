import { openDB, type IDBPDatabase } from 'idb'
import { STORAGE_STORES, type StorageStoreName } from './types'

const DB_NAME = 'personal-dashboard'
const DB_VERSION = 1

type AppDatabase = IDBPDatabase<{
	layouts: { key: string; value: unknown }
	'widget-settings': { key: string; value: unknown }
	preferences: { key: string; value: unknown }
	cache: { key: string; value: unknown }
	notes: { key: string; value: unknown }
}>

let dbPromise: Promise<AppDatabase> | null = null

function getDatabase(): Promise<AppDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(database) {
				for (const storeName of Object.values(STORAGE_STORES)) {
					if (!database.objectStoreNames.contains(storeName)) {
						database.createObjectStore(storeName)
					}
				}
			},
		})
	}

	return dbPromise
}

export async function getStorageItem<T>(
	store: StorageStoreName,
	key: string,
): Promise<T | null> {
	const database = await getDatabase()
	const value = await database.get(store, key)
	return (value as T | undefined) ?? null
}

export async function setStorageItem<T>(
	store: StorageStoreName,
	key: string,
	value: T,
): Promise<void> {
	const database = await getDatabase()
	await database.put(store, value, key)
}

export async function deleteStorageItem(
	store: StorageStoreName,
	key: string,
): Promise<void> {
	const database = await getDatabase()
	await database.delete(store, key)
}

export async function clearStorageStore(store: StorageStoreName): Promise<void> {
	const database = await getDatabase()
	await database.clear(store)
}

export async function getAllStorageKeys(store: StorageStoreName): Promise<string[]> {
	const database = await getDatabase()
	return database.getAllKeys(store) as Promise<string[]>
}
