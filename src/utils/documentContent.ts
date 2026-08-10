export function htmlToPlainText(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export function htmlToPlainTextMultiline(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	const blocks: string[] = []

	for (const node of Array.from(doc.body.childNodes)) {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			continue
		}

		const element = node as HTMLElement
		const text = element.textContent?.trim() ?? ''
		if (!text) {
			continue
		}

		blocks.push(text)
	}

	if (blocks.length === 0) {
		return doc.body.textContent?.trim() ?? ''
	}

	return blocks.join('\n\n')
}

export function htmlToMarkdown(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	const parts: string[] = []

	for (const node of Array.from(doc.body.childNodes)) {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			continue
		}

		const element = node as HTMLElement
		const text = element.textContent?.trim() ?? ''
		if (!text) {
			continue
		}

		switch (element.tagName) {
			case 'H1':
				parts.push(`# ${text}`)
				break
			case 'H2':
				parts.push(`## ${text}`)
				break
			case 'H3':
				parts.push(`### ${text}`)
				break
			case 'LI':
				parts.push(`- ${text}`)
				break
			case 'BLOCKQUOTE':
				parts.push(`> ${text}`)
				break
			default:
				parts.push(text)
		}
	}

	if (parts.length === 0) {
		return htmlToPlainTextMultiline(html)
	}

	return parts.join('\n\n')
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
