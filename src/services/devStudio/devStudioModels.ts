export const DEV_STUDIO_MODEL_IDS = [
	'gemini-2.5-flash',
	'gemini-3.6-flash',
	'gemini-3.1-pro-preview',
	'qwen-3.6-plus-free',
] as const

export type DevStudioModelId = (typeof DEV_STUDIO_MODEL_IDS)[number]

export type DevStudioModelProvider = 'gemini' | 'openrouter'

export const OPENROUTER_QWEN_36_PLUS_FREE_MODEL =
	'qwen/qwen3.6-plus-preview:free'

export const DEFAULT_DEV_STUDIO_MODEL_ID: DevStudioModelId = 'gemini-3.6-flash'

export interface DevStudioModelDefinition {
	id: DevStudioModelId
	name: string
	analogy: string
	description: string
	maxIterations: number
	provider: DevStudioModelProvider
	openRouterModelId?: string
}

export const DEV_STUDIO_MODELS: DevStudioModelDefinition[] = [
	{
		id: 'gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		analogy: 'Haiku',
		description:
			'Fastest and cheapest. Best for quick fixes, typos, and single-file tweaks.',
		maxIterations: 64,
		provider: 'gemini',
	},
	{
		id: 'gemini-3.6-flash',
		name: 'Gemini 3.6 Flash',
		analogy: 'Sonnet',
		description:
			'Default balance of speed and quality. Great for everyday coding and small features.',
		maxIterations: 128,
		provider: 'gemini',
	},
	{
		id: 'gemini-3.1-pro-preview',
		name: 'Gemini 3.1 Pro',
		analogy: 'Opus',
		description:
			'Deepest reasoning. Slower but better for multi-file refactors and tricky bugs.',
		maxIterations: 256,
		provider: 'gemini',
	},
	{
		id: 'qwen-3.6-plus-free',
		name: 'Qwen 3.6 Plus',
		analogy: 'Free coder',
		description:
			'Free OpenRouter preview for Dev Studio coding. Strong on agentic multi-file edits.',
		maxIterations: 128,
		provider: 'openrouter',
		openRouterModelId: OPENROUTER_QWEN_36_PLUS_FREE_MODEL,
	},
]

const modelMap = new Map(DEV_STUDIO_MODELS.map((model) => [model.id, model]))

export function getDevStudioModelById(
	id: string,
): DevStudioModelDefinition | undefined {
	return modelMap.get(id as DevStudioModelId)
}

export function getDevStudioModelProvider(modelId: string): DevStudioModelProvider {
	const model = getDevStudioModelById(resolveDevStudioModelId(modelId))
	return model?.provider ?? 'gemini'
}

export function resolveOpenRouterModelId(modelId: string): string {
	const model = getDevStudioModelById(resolveDevStudioModelId(modelId))
	return model?.openRouterModelId ?? OPENROUTER_QWEN_36_PLUS_FREE_MODEL
}

export function resolveDevStudioModelId(
	preferredId: string | undefined,
): DevStudioModelId {
	if (preferredId === 'gemini-3-flash-preview') {
		return 'gemini-3.1-pro-preview'
	}
	if (preferredId && modelMap.has(preferredId as DevStudioModelId)) {
		return preferredId as DevStudioModelId
	}
	return DEFAULT_DEV_STUDIO_MODEL_ID
}

export function getMaxIterationsForModel(modelId: string): number {
	const resolvedId = resolveDevStudioModelId(modelId)
	const model = getDevStudioModelById(resolvedId)
	return model?.maxIterations ?? 128
}
