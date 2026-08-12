import { DEV_STUDIO_TOOL_DECLARATIONS } from '@/services/devStudio/devStudioWorkspaceTools'

type DevStudioToolDeclaration = (typeof DEV_STUDIO_TOOL_DECLARATIONS)[number]

export interface OpenAiToolDefinition {
	type: 'function'
	function: {
		name: string
		description?: string
		parameters: Record<string, unknown>
	}
}

function normalizeJsonSchema(value: unknown): unknown {
	if (value === null || typeof value !== 'object') {
		return value
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeJsonSchema(item))
	}

	const record = value as Record<string, unknown>
	const normalized: Record<string, unknown> = {}

	for (const [key, nested] of Object.entries(record)) {
		if (key === 'type' && typeof nested === 'string') {
			normalized[key] = nested.toLowerCase()
			continue
		}
		normalized[key] = normalizeJsonSchema(nested)
	}

	return normalized
}

export function convertDevStudioToolsToOpenAi(
	tools: readonly DevStudioToolDeclaration[],
): OpenAiToolDefinition[] {
	return tools.map((tool) => ({
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: normalizeJsonSchema(tool.parameters) as Record<string, unknown>,
		},
	}))
}
