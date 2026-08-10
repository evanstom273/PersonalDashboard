const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export class GeminiApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'GeminiApiError'
		this.status = status
	}
}

export async function geminiFetch<T>(
	apiKey: string,
	path: string,
	init?: RequestInit,
): Promise<T> {
	const separator = path.includes('?') ? '&' : '?'
	const url = `${GEMINI_API_BASE}${path}${separator}key=${encodeURIComponent(apiKey)}`

	const response = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers,
		},
	})

	if (!response.ok) {
		let message = `Gemini API request failed (${response.status})`
		try {
			const body = (await response.json()) as {
				error?: { message?: string }
			}
			if (body.error?.message) {
				message = body.error.message
			}
		} catch {
			// ignore parse errors
		}
		throw new GeminiApiError(message, response.status)
	}

	return response.json() as Promise<T>
}

export function toDataUrl(mimeType: string, base64Data: string): string {
	return `data:${mimeType};base64,${base64Data}`
}

export async function pollOperation<T>(
	apiKey: string,
	operationName: string,
	maxAttempts = 60,
	intervalMs = 3000,
): Promise<T> {
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const operation = await geminiFetch<{
			done?: boolean
			error?: { message?: string }
			response?: T
		}>(apiKey, `/${operationName}`)

		if (operation.error?.message) {
			throw new GeminiApiError(operation.error.message, 500)
		}

		if (operation.done) {
			if (!operation.response) {
				throw new GeminiApiError('Operation completed without a response', 500)
			}
			return operation.response
		}

		await new Promise((resolve) => {
			setTimeout(resolve, intervalMs)
		})
	}

	throw new GeminiApiError('Operation timed out', 504)
}
