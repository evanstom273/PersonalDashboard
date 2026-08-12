import {
	isGemmaDevStudioModel,
	resolveDevStudioModelId,
} from '@/services/devStudio/devStudioModels'

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

const DEFAULT_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 60_000,
	maxSearchFiles: 24,
	maxSearchResults: 40,
	maxListPaths: 500,
	maxToolResponseJsonChars: 32_000,
	minRequestIntervalMs: 0,
	maxContextContents: 40,
	maxSeedMessages: 20,
	includeThoughts: true,
}

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
	if (isGemmaDevStudioModel(modelId)) {
		return GEMMA_BUDGET
	}
	return DEFAULT_BUDGET
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
		...response,
		_truncated: true,
		_preview: `${serialized.slice(0, maxChars - 120)}…`,
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

	const seedCount = Math.min(budget.maxSeedMessages, contents.length)
	const seed = contents.slice(0, seedCount)
	const tail = contents.slice(-Math.max(0, budget.maxContextContents - seedCount))

	if (tail.length === 0) {
		return seed
	}

	return [...seed, ...tail]
}

export function sleep(ms: number): Promise<void> {
	if (ms <= 0) {
		return Promise.resolve()
	}
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

export function getResolvedModelBudgetLabel(modelId: string): string {
	const resolved = resolveDevStudioModelId(modelId)
	return resolved === 'gemma-4-31b-it' ? 'Gemma (quota-aware)' : resolved
}
