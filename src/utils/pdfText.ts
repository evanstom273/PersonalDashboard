import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

export async function extractPdfText(file: File): Promise<string> {
	const buffer = await file.arrayBuffer()
	const document = await getDocument({ data: buffer }).promise
	const pageTexts: string[] = []

	for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
		const page = await document.getPage(pageNumber)
		const content = await page.getTextContent()
		const text = content.items
			.map((item) => ('str' in item ? item.str : ''))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim()

		if (text) {
			pageTexts.push(text)
		}
	}

	const extracted = pageTexts.join('\n\n').trim()
	if (!extracted) {
		throw new Error(
			`${file.name} has no extractable text. Image-only or scanned PDFs are not supported yet.`,
		)
	}

	return extracted
}
