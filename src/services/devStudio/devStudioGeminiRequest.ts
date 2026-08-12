import { GeminiApiError } from '@/services/gemini/client'
import {
	geminiStreamGenerateContent,
	type StreamedGenerateResult,
} from '@/services/gemini/stream'
import { parseGeminiRetryDelayMs, sleep } from '@/services/devStudio/devStudioTokenBudget'

const MAX_QUOTA_RETRIES = 4

export function isGeminiQuotaError(error: unknown): boolean {
	if (!(error instanceof GeminiApiError)) {
		return false
	}
	if (error.status === 429) {
		return true
	}
	const message = error.message.toLowerCase()
	return message.includes('quota') || message.includes('rate limit')
}

export function formatGeminiQuotaErrorMessage(error: unknown): string {
	if (!(error instanceof GeminiApiError)) {
		return error instanceof Error ? error.message : 'Generation failed.'
	}
	if (!isGeminiQuotaError(error)) {
		return error.message
	}

	const retryMs = parseGeminiRetryDelayMs(error.message)
	if (retryMs) {
		const seconds = Math.ceil(retryMs / 1000)
		return `Gemini input-token quota reached (16k/min on Gemma). The agent will wait and retry automatically — or try again in ~${seconds}s. For large files, use search_workspace_code or read a line range. Flash/Pro models have higher limits.`
	}

	return `${error.message} Try a smaller request, wait a minute, or switch to Gemini Flash in Dev Studio.`
}

export async function geminiStreamDevStudioRequest(
	apiKey: string,
	modelId: string,
	requestBody: Record<string, unknown>,
	options?: {
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onThoughtDelta?: (delta: string) => void
		onQuotaWait?: (waitMs: number) => void
	},
): Promise<StreamedGenerateResult> {
	let lastError: unknown

	for (let attempt = 0; attempt <= MAX_QUOTA_RETRIES; attempt += 1) {
		if (options?.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		try {
			return await geminiStreamGenerateContent(
				apiKey,
				modelId,
				requestBody,
				options,
			)
		} catch (error) {
			lastError = error
			if (!isGeminiQuotaError(error) || attempt >= MAX_QUOTA_RETRIES) {
				throw error
			}

			const waitMs =
				parseGeminiRetryDelayMs(
					error instanceof GeminiApiError ? error.message : '',
				) ?? 35_000
			options?.onQuotaWait?.(waitMs)
			await sleep(waitMs)
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Generation failed.')
}
