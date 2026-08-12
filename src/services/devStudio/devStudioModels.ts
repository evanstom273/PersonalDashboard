export const DEV_STUDIO_MODEL_IDS = [
	'gemini-2.5-flash',
	'gemini-3.6-flash',
	'gemini-3.1-pro-preview',
	'gemma-4-31b-it',
] as const

export type DevStudioModelId = (typeof DEV_STUDIO_MODEL_IDS)[number]

export const GEMMA_4_31B_GEMINI_MODEL_ID = 'gemma-4-31b-it'

export const DEFAULT_DEV_STUDIO_MODEL_ID: DevStudioModelId = 'gemini-3.6-flash'

export interface DevStudioModelDefinition {
	id: DevStudioModelId
	name: string
	analogy: string
	description: string
	maxIterations: number
}

export const DEV_STUDIO_MODELS: DevStudioModelDefinition[] = [
	{
		id: 'gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		analogy: 'Haiku',
		description:
			'Fastest and cheapest. Best for quick fixes, typos, and single-file tweaks.',
		maxIterations: 64,
	},
	{
		id: 'gemini-3.6-flash',
		name: 'Gemini 3.6 Flash',
		analogy: 'Sonnet',
		description:
			'Default balance of speed and quality. Great for everyday coding and small features.',
		maxIterations: 128,
	},
	{
		id: 'gemini-3.1-pro-preview',
		name: 'Gemini 3.1 Pro',
		analogy: 'Opus',
		description:
			'Deepest reasoning. Slower but better for multi-file refactors and tricky bugs.',
		maxIterations: 256,
	},
	{
		id: 'gemma-4-31b-it',
		name: 'Gemma 4 31B',
		analogy: 'Free coder',
		description:
			'Free on Gemini API (Tier 2). Fast coding model — uses your Gemini key and quota.',
		maxIterations: 96,
	},
]

const modelMap = new Map(DEV_STUDIO_MODELS.map((model) => [model.id, model]))

export function getDevStudioModelById(
	id: string,
): DevStudioModelDefinition | undefined {
	return modelMap.get(id as DevStudioModelId)
}

export function resolveDevStudioModelId(
	preferredId: string | undefined,
): DevStudioModelId {
	if (preferredId === 'gemini-3-flash-preview') {
		return 'gemini-3.1-pro-preview'
	}
	if (
		preferredId === 'qwen-3.6-plus-free' ||
		preferredId === 'gemma-4-31b-free'
	) {
		return 'gemma-4-31b-it'
	}
	if (preferredId && modelMap.has(preferredId as DevStudioModelId)) {
		return preferredId as DevStudioModelId
	}
	return DEFAULT_DEV_STUDIO_MODEL_ID
}

export function resolveDevStudioGeminiModelId(modelId: string): string {
	return resolveDevStudioModelId(modelId)
}

export function isGemmaDevStudioModel(modelId: string): boolean {
	return resolveDevStudioModelId(modelId) === 'gemma-4-31b-it'
}

export function getMaxIterationsForModel(modelId: string): number {
	const resolvedId = resolveDevStudioModelId(modelId)
	const model = getDevStudioModelById(resolvedId)
	return model?.maxIterations ?? 128
}
