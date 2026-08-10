import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { StoreName } from './types'

interface GeminiChatDB extends DBSchema {
	preferences: {
		key: string
		value: unknown
	}
	conversations: {
		key: string
		value: unknown
	}
	cache: {
		key: string
		value: unknown
	}
}

const DB_NAME = 'gemini-chat'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<GeminiChatDB>> | null = null

export function getDb(): Promise<IDBPDatabase<GeminiChatDB>> {
	if (!dbPromise) {
		dbPromise = openDB<GeminiChatDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				const stores: StoreName[] = ['preferences', 'conversations', 'cache']
				for (const store of stores) {
					if (!db.objectStoreNames.contains(store)) {
						db.createObjectStore(store)
					}
				}
			},
		})
	}

	return dbPromise
}
