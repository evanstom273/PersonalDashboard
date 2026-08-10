import { buildReminderAssistantMessage } from '@/services/reminders/reminderDelivery'
import {
	listDueReminders,
	markReminderFired,
	notifyRemindersChanged,
} from '@/services/reminders/reminderService'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import { notifyReminderDue } from '@/utils/notifications'

export interface ProcessDueRemindersOptions {
	preferences: UserPreferences
	appendMessages: (messages: StoredMessage[]) => Promise<unknown>
	isChatRoute: boolean
}

export async function processDueReminders(
	options: ProcessDueRemindersOptions,
): Promise<number> {
	const due = await listDueReminders()
	if (due.length === 0) {
		return 0
	}

	const aiName = options.preferences.aiName.trim() || 'Assistant'
	let firedCount = 0

	for (const reminder of due) {
		const content = buildReminderAssistantMessage(reminder, options.preferences)
		await options.appendMessages([
			{
				id: crypto.randomUUID(),
				role: 'assistant',
				content,
				createdAt: Date.now(),
			},
		])

		await markReminderFired(reminder)
		firedCount += 1

		void notifyReminderDue(aiName, reminder.title, content, {
			isChatRoute: options.isChatRoute,
		})
	}

	notifyRemindersChanged()
	return firedCount
}
