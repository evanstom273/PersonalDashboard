import type { DocumentRecord } from '@/storage/types'
import { htmlToPlainText } from '@/utils/documentContent'

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = filename
	anchor.click()
	URL.revokeObjectURL(url)
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
	const anchor = document.createElement('a')
	anchor.href = dataUrl
	anchor.download = filename
	anchor.click()
}

export function sanitizeFilename(value: string): string {
	const sanitized = value
		.trim()
		.replace(/[<>:"/\\|?*]+/g, '-')
		.replace(/\s+/g, ' ')
		.slice(0, 120)

	return sanitized || 'download'
}

export function extensionForMimeType(mimeType: string): string {
	if (mimeType.includes('png')) return 'png'
	if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
	if (mimeType.includes('webp')) return 'webp'
	if (mimeType.includes('gif')) return 'gif'
	if (mimeType.includes('mp3')) return 'mp3'
	if (mimeType.includes('wav')) return 'wav'
	if (mimeType.includes('ogg')) return 'ogg'
	if (mimeType.includes('mp4')) return 'mp4'
	if (mimeType.includes('webm')) return 'webm'
	return 'bin'
}

export function downloadDocument(
	document: DocumentRecord,
	format: 'html' | 'txt' = 'html',
): void {
	const filename = `${sanitizeFilename(document.title)}.${format}`
	const content =
		format === 'txt' ? htmlToPlainText(document.content) : document.content
	const mimeType = format === 'txt' ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8'
	downloadBlob(new Blob([content], { type: mimeType }), filename)
}

export function downloadLibraryMediaItem(
	title: string,
	mimeType: string,
	dataUrl: string,
): void {
	const extension = extensionForMimeType(mimeType)
	downloadDataUrl(dataUrl, `${sanitizeFilename(title)}.${extension}`)
}
