import { listDocuments } from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'
import {
	htmlToMarkdown,
	normalizeDocumentRecord,
} from '@/utils/documentContent'
import { buildSystemInstruction } from '@/services/gemini/systemInstruction'
import type { UserPreferences } from '@/storage/types'

const MAX_CHARS_PER_DOCUMENT = 12_000
const MAX_TOTAL_CONTEXT_CHARS = 120_000

function truncateWithNotice(text: string, maxChars: number): string {
	if (text.length <= maxChars) {
		return text
	}

	return `${text.slice(0, maxChars)}\n\n[Document truncated for context length.]`
}

function documentBodyForContext(document: DocumentRecord): string {
	if (document.contentFormat === 'markdown') {
		return document.content
	}

	return htmlToMarkdown(document.content)
}

export function formatDocumentForContext(document: DocumentRecord): string {
	const normalized = normalizeDocumentRecord(document)
	const body = truncateWithNotice(
		documentBodyForContext(normalized),
		MAX_CHARS_PER_DOCUMENT,
	)
	const accessLabel = normalized.readOnly ? 'read-only upload' : 'editable'

	return [
		`### ${normalized.title}`,
		`- id: ${normalized.id}`,
		`- access: ${accessLabel}`,
		`- format: ${normalized.contentFormat}`,
		'',
		body,
	].join('\n')
}

export function buildDocumentLibraryContext(
	documents: DocumentRecord[],
): string {
	if (documents.length === 0) {
		return [
			'## Document library (always in context)',
			'',
			'No documents yet. Use document tools to create one.',
		].join('\n')
	}

	const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt)
	const sections: string[] = []
	let totalChars = 0
	let omittedCount = 0

	for (const document of sorted) {
		const section = formatDocumentForContext(document)
		if (totalChars + section.length > MAX_TOTAL_CONTEXT_CHARS) {
			omittedCount += 1
			continue
		}

		sections.push(section)
		totalChars += section.length
	}

	const header = [
		'## Document library (always in context)',
		'',
		'All library documents are injected here on every message. Use document tools to create, update, rename, or delete. Uploaded documents are read-only.',
		'',
	].join('\n')

	const omittedNote =
		omittedCount > 0
			? `\n\n_${omittedCount} additional document${omittedCount === 1 ? '' : 's'} omitted due to context size limits. Use read_document for full text._`
			: ''

	return `${header}${sections.join('\n\n---\n\n')}${omittedNote}`
}

export async function buildFullSystemInstruction(
	preferences: UserPreferences,
): Promise<string> {
	const documents = await listDocuments()
	const base = buildSystemInstruction(preferences)
	const libraryContext = buildDocumentLibraryContext(documents)
	return `${base}\n\n${libraryContext}`
}
