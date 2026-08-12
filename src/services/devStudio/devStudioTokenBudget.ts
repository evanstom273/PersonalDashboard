import { resolveDevStudioModelId } from '@/services/devStudio/devStudioModels'

export interface DevStudioTokenBudget {
	maxReadChars: number
	maxLinesPerRead: number
	maxSearchFiles: number
	maxSearchResults: number
	maxListPaths: number
	maxToolResponseJsonChars: number
	minRequestIntervalMs: number
	maxContextContents: number
	maxSeedMessages: number
	includeThoughts: boolean
	/** Rolling input-token cap per minute (Gemma Tier 2 = 16k). */
	tpmLimitTokens: number | null
}

/** Default Dev Studio limits — tighter than raw API max context on every model. */
const FLASH_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 32_000,
	maxLinesPerRead: 400,
	maxSearchFiles: 16,
	maxSearchResults: 24,
	maxListPaths: 250,
	maxToolResponseJsonChars: 12_000,
	minRequestIntervalMs: 400,
	maxContextContents: 18,
	maxSeedMessages: 8,
	includeThoughts: true,
	tpmLimitTokens: null,
}

const PRO_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 48_000,
	maxLinesPerRead: 600,
	maxSearchFiles: 20,
	maxSearchResults: 32,
	maxListPaths: 350,
	maxToolResponseJsonChars: 16_000,
	minRequestIntervalMs: 400,
	maxContextContents: 24,
	maxSeedMessages: 12,
	includeThoughts: true,
	tpmLimitTokens: null,
}

/** Gemma Tier 2: 30 RPM, 16k TPM, 14.4k RPD — stay well under TPM. */
const GEMMA_BUDGET: DevStudioTokenBudget = {
	maxReadChars: 5_000,
	maxLinesPerRead: 100,
	maxSearchFiles: 6,
	maxSearchResults: 10,
	maxListPaths: 80,
	maxToolResponseJsonChars: 2_000,
	minRequestIntervalMs: 6_000,
	maxContextContents: 4,
	maxSeedMessages: 1,
	includeThoughts: false,
	tpmLimitTokens: 12_000,
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
		_note: 'Response trimmed to fit Dev Studio context budget. Use start_line/end_line or search for more detail.',
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

export function estimateRequestTokens(body: Record<string, unknown>): number {
	return Math.ceil(JSON.stringify(body).length / 3.5)
}

export class DevStudioTpmTracker {
	private entries: Array<{ at: number; tokens: number }> = []

	record(tokens: number): void {
		this.entries.push({ at: Date.now(), tokens })
		this.prune()
	}

	prune(): void {
		const cutoff = Date.now() - 60_000
		this.entries = this.entries.filter((entry) => entry.at > cutoff)
	}

	getUsedTokens(): number {
		this.prune()
		return this.entries.reduce((sum, entry) => sum + entry.tokens, 0)
	}

	async waitForCapacity(
		neededTokens: number,
		limitTokens: number,
		signal?: AbortSignal,
	): Promise<void> {
		this.prune()
		const target = limitTokens * 0.9

		while (this.getUsedTokens() + neededTokens > target) {
			if (signal?.aborted) {
				throw new DOMException('Generation aborted', 'AbortError')
			}

			const oldest = this.entries[0]
			if (!oldest) {
				await sleep(2_000)
				continue
			}

			const waitMs = oldest.at + 60_000 - Date.now() + 500
			await sleep(Math.max(waitMs, 1_000))
			this.prune()
		}
	}
}

export function parseGeminiRetryDelayMs(message: string): number | null {
	const match = message.match(/retry in (\d+(?:\.\d+)?)s/i)
	if (!match) {
		return null
	}
	return Math.ceil(Number.parseFloat(match[1]) * 1000) + 500
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

export interface FileLineSliceResult {
	content: string
	totalLines: number
	startLine: number
	endLine: number
	truncated: boolean
}

export function sliceFileContentByLines(
	fullContent: string,
	options: {
		startLine?: number
		endLine?: number
		maxLines: number
		maxChars: number
	},
): FileLineSliceResult {
	const lines = fullContent.split('\n')
	const totalLines = lines.length
	const startLine = Math.max(1, options.startLine ?? 1)
	const requestedEnd = options.endLine ?? startLine + options.maxLines - 1
	const endLine = Math.min(totalLines, requestedEnd, startLine + options.maxLines - 1)

	if (startLine > totalLines) {
		return {
			content: '',
			totalLines,
			startLine,
			endLine: startLine,
			truncated: false,
		}
	}

	let slice = lines.slice(startLine - 1, endLine).join('\n')
	let truncated = endLine < totalLines || endLine < requestedEnd

	if (slice.length > options.maxChars) {
		slice = `${slice.slice(0, options.maxChars)}\n[Truncated for context length.]`
		truncated = true
	}

	return {
		content: slice,
		totalLines,
		startLine,
		endLine,
		truncated,
	}
}
