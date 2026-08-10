export function htmlToPlainText(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export function normalizeDocumentContent(content: string): string {
	const trimmed = content.trim()
	if (!trimmed) {
		return '<p></p>'
	}

	if (/<[a-z][\s\S]*>/i.test(trimmed)) {
		return trimmed
	}

	return trimmed
		.split(/\n{2,}/)
		.map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
		.join('')
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}

export function formatTimestamp(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(timestamp))
}
