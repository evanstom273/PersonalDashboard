export const DEV_STUDIO_MODEL_IDS = [
	'gemini-2.5-flash',
	'gemini-3.6-flash',
	'gemini-3.1-pro-preview',
] as const

export type DevStudioModelId = (typeof DEV_STUDIO_MODEL_IDS)[number]

export const DEFAULT_DEV_STUDIO_MODEL_ID: DevStudioModelId = 'gemini-3.6-flash'

export interface DevStudioModelDefinition {
	id: DevStudioModelId
	name: string
	analogy: string
	description: string
}

export const DEV_STUDIO_MODELS: DevStudioModelDefinition[] = [
	{
		id: 'gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		analogy: 'Haiku',
		description:
			'Fastest and cheapest. Best for quick fixes, typos, and single-file tweaks.',
	},
	{
		id: 'gemini-3.6-flash',
		name: 'Gemini 3.6 Flash',
		analogy: 'Sonnet',
		description:
			'Default balance of speed and quality. Great for everyday coding and small features.',
	},
	{
		id: 'gemini-3.1-pro-preview',
		name: 'Gemini 3.1 Pro',
		analogy: 'Opus',
		description:
			'Deepest reasoning. Slower but better for multi-file refactors and tricky bugs.',
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
	if (preferredId && modelMap.has(preferredId as DevStudioModelId)) {
		return preferredId as DevStudioModelId
	}
	return DEFAULT_DEV_STUDIO_MODEL_ID
}
