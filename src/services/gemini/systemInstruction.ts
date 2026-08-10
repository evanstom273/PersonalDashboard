import type { UserPreferences } from '@/storage/types'

const DEFAULT_AI_NAME = 'Assistant'
const DEFAULT_USER_NAME = 'the user'

export function getConfiguredAiName(preferences: UserPreferences): string {
	return preferences.aiName.trim() || DEFAULT_AI_NAME
}

export function getConfiguredUserName(preferences: UserPreferences): string {
	return preferences.userName.trim() || DEFAULT_USER_NAME
}

export function buildSystemInstruction(preferences: UserPreferences): string {
	const aiName = getConfiguredAiName(preferences)
	const userName = getConfiguredUserName(preferences)
	const behavior = preferences.aiBehaviorInstructions.trim()

	const sections = [
		`You are ${aiName}. You are speaking with ${userName}.`,
		behavior
			? behavior
			: 'Be helpful, clear, and accurate. Match the user\'s tone when appropriate.',
		[
			'Application capabilities you must respect:',
			'- This app uses one continuous conversation.',
			'- You can manage shared documents through the provided tools. Documents belong to both the user and you; there is no separate AI document library.',
			'- The IndexedDB document store is always authoritative. Read a document before updating it.',
			'- Use document tools instead of duplicating full document contents in chat unless the user explicitly asks for that.',
			'- Deleting a document requires user confirmation in the app UI.',
			'- Format replies with markdown when helpful: use blockquotes for quoted document excerpts, fenced code blocks for code, and headings for longer structured answers.',
		].join('\n'),
	]

	return sections.join('\n\n')
}
