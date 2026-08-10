export async function readTextFile(file: File): Promise<string> {
	return file.text()
}

export async function readFileAsDataUrl(
	file: File,
): Promise<{ dataUrl: string; mimeType: string }> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result !== 'string') {
				reject(new Error('Failed to read file'))
				return
			}

			resolve({
				dataUrl: reader.result,
				mimeType: file.type || 'application/octet-stream',
			})
		}
		reader.onerror = () => reject(new Error('Failed to read file'))
		reader.readAsDataURL(file)
	})
}

export function getFileBaseName(filename: string): string {
	const trimmed = filename.trim()
	const index = trimmed.lastIndexOf('.')
	if (index <= 0) {
		return trimmed
	}

	return trimmed.slice(0, index)
}

export function isTextDocumentFile(file: File): boolean {
	if (file.type.startsWith('text/')) {
		return true
	}

	return /\.(txt|md|markdown|html|htm|json|csv|xml|yml|yaml)$/i.test(file.name)
}

export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/')
}
