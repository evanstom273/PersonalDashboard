import { useEffect } from 'react'
import {
	canUseNotificationTriggers,
	syncReminderNotificationTriggers,
} from '@/services/reminders/reminderNotificationTriggers'
import { subscribeRemindersChanged } from '@/services/reminders/reminderService'
import type { UserPreferences } from '@/storage/types'
import { getNotificationPermission } from '@/utils/notifications'

interface UseReminderOsSyncOptions {
	preferences: UserPreferences
	enabled?: boolean
}

export function useReminderOsSync({
	preferences,
	enabled = true,
}: UseReminderOsSyncOptions): void {
	useEffect(() => {
		if (!enabled || !canUseNotificationTriggers()) {
			return
		}

		let cancelled = false

		async function sync(): Promise<void> {
			if (cancelled || getNotificationPermission() !== 'granted') {
				return
			}

			await syncReminderNotificationTriggers(preferences)
		}

		void sync()

		return subscribeRemindersChanged(() => {
			void sync()
		})
	}, [enabled, preferences, preferences.aiName])
}
