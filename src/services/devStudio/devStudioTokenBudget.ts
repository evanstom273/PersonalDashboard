import { resolveDevStudioModelId } from '@/services/devStudio/devStudioModels'

export interface DevStudioTokenBudget {
	maxReadChars: number
	maxSearchFiles: number
	maxSearchResults: number
	maxListPaths: number
	maxToolResponseJsonChars: number
	minRequestIntervalMs: number
	maxContextContents: number
	maxSeedMessages: number
	includeThoughts: boolean
}

/** Default Dev Studio limits — tighter than raw API max context on every model. */
const FLASH_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 32_000,
	maxSearchFiles: 16,
	maxSearchResults: 24,
	maxListPaths: 250,
	maxToolResponseJsonChars: 12_000,
	minRequestIntervalMs: 400,
	maxContextContents: 18,
	maxSeedMessages: 8,
	includeThoughts: true,
}

const PRO_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 48_000,
	maxSearchFiles: 20,
	maxSearchResults: 32,
	maxListPaths: 350,
	maxToolResponseJsonChars: 16_000,
	minRequestIntervalMs: 400,
	maxContextContents: 24,
	maxSeedMessages: 12,
	includeThoughts: true,
}

/** Strictest tier — Gemma Tier 2 RPM/TPM caps. */
const GEMMA_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 20_000,
	maxSearchFiles: 10,
	maxSearchResults: 16,
	maxListPaths: 150,
	maxToolResponseJsonChars: 6_000,
	minRequestIntervalMs: 2_100,
	maxContextContents: 10,
	maxSeedMessages: 4,
	includeThoughts: false,
}

export function getDevStudioTokenBudget(modelId: string): DevStudioTokenBudget {
	const resolved = resolveDevStudioModelId(modelId)

	if (resolved === 'gemma-4-31b-it') {
		return GEMMA_BUDGET
	}
	if (resolved === 'gemini-3.1-pro-preview') {
		return PRO_BUDGET
	}
	return FLASH_BUDGET
}

interface GeminiContentPart {
	text?: string
	functionCall?: { name: string; args?: Record<string, unknown> }
	functionResponse?: { name: string; response: Record<string, unknown> }
	inlineData?: { mimeType: string; data: string }
}

interface GeminiContent {
	role?: string
	parts: GeminiContentPart[]
}

function truncateJsonResponse(
	response: Record<string, unknown>,
	maxChars: number,
): Record<string, unknown> {
	const serialized = JSON.stringify(response)
	if (serialized.length <= maxChars) {
		return response
	}
	return {
		_truncated: true,
		_note: 'Response trimmed to fit Dev Studio context budget. Narrow your next tool call if you need more detail.',
		_preview: `${serialized.slice(0, maxChars - 160)}…`,
	}
}

export function compactToolResponseForBudget(
	response: Record<string, unknown>,
	budget: DevStudioTokenBudget,
): Record<string, unknown> {
	return truncateJsonResponse(response, budget.maxToolResponseJsonChars)
}

export function pruneDevStudioContents(
	contents: GeminiContent[],
	budget: DevStudioTokenBudget,
): GeminiContent[] {
	if (contents.length <= budget.maxContextContents) {
		return contents
	}

	const anchor = contents[0]
	const tailCount = Math.max(0, budget.maxContextContents - 1)
	const tail = contents.slice(-tailCount)

	if (tail.length === 0) {
		return [anchor]
	}

	if (tail[0] === anchor) {
		return tail
	}

	return [anchor, ...tail]
}

export function sleep(ms: number): Promise<void> {
	if (ms <= 0) {
		return Promise.resolve()
	}
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

export interface DevStudioReadCacheEntry {
	content: string
	sha: string
}

export type DevStudioReadCache = Map<string, DevStudioReadCacheEntry>

export function createDevStudioReadCache(): DevStudioReadCache {
	return new Map()
}
