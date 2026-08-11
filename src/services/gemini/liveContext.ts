import { buildMemoryContextFromStore } from '@/services/gemini/memoryContext'
import { buildProjectContextFromStore } from '@/services/gemini/projectContext'
import { buildScheduleContextFromStore } from '@/services/gemini/scheduleContext'
import { buildSystemInstruction } from '@/services/gemini/systemInstruction'
import { buildAppReferenceContext } from '@/services/gemini/appReferenceContext'
import type { StoredMessage, UserPreferences } from '@/storage/types'

const MAX_LIVE_CONTEXT_CHARS = 32_000

export async function buildLiveSessionInstruction(
	preferences: UserPreferences,
	recentMessages: StoredMessage[] = [],
): Promise<string> {
	const base = buildSystemInstruction(preferences)
	const appReference = buildAppReferenceContext()
	const memoryContext = await buildMemoryContextFromStore()
	const scheduleContext = await buildScheduleContextFromStore()
	const projectContext = await buildProjectContextFromStore()

	const recentLines = recentMessages
		.slice(-8)
		.map((message) => {
			const role = message.role === 'user' ? 'User' : 'Assistant'
			const excerpt = message.content.trim().slice(0, 600)
			return `${role}: ${excerpt}`
		})
		.join('\n')

	const sections = [
		base,
		appReference,
		memoryContext,
		scheduleContext,
		projectContext,
		recentLines
			? `## Recent conversation (for continuity only)\n${recentLines}`
			: '',
		'You are in Live voice mode. Keep spoken replies concise and natural. Use tools when needed for documents, projects, reminders, or codebase inspection.',
	].filter((section) => section.trim().length > 0)

	const combined = sections.join('\n\n')
	if (combined.length <= MAX_LIVE_CONTEXT_CHARS) {
		return combined
	}

	return `${combined.slice(0, MAX_LIVE_CONTEXT_CHARS)}\n\n[Context truncated for Live session size.]`
}
