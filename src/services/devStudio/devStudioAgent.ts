import { buildDevStudioSystemInstruction } from '@/services/devStudio/devStudioAgentPrompt'
import {
	DEV_STUDIO_LIMIT_REACHED_MESSAGE,
	type DevStudioAgentRunResult,
} from '@/services/devStudio/devStudioAgentTypes'
import {
	getDevStudioModelProvider,
	getMaxIterationsForModel,
	resolveDevStudioModelId,
} from '@/services/devStudio/devStudioModels'
import { generateOpenRouterDevStudioChat } from '@/services/devStudio/openRouterDevStudioAgent'
import {
	DEV_STUDIO_READ_ONLY_TOOL_NAMES,
	DEV_STUDIO_TOOL_DECLARATIONS,
	executeDevStudioToolCall,
	type DevStudioToolContext,
} from '@/services/devStudio/devStudioWorkspaceTools'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import { geminiStreamGenerateContent } from '@/services/gemini/stream'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { DevStudioAgentPhase, DevStudioExecutionMode } from '@/types/devStudio'
import type { DevStudioRepoRef } from '@/types/devStudio'

interface GeminiPart {
	text?: string
	functionCall?: {
		name: string
		args?: Record<string, unknown>
	}
	functionResponse?: {
		name: string
		response: Record<string, unknown>
	}
	inlineData?: {
		mimeType: string
		data: string
	}
}

interface GeminiContent {
	role?: string
	parts: GeminiPart[]
}

function buildDevStudioGenerationConfig(modelId: string): Record<string, unknown> {
	if (modelId.startsWith('gemini-2.5')) {
		return {
			thinkingConfig: {
				includeThoughts: true,
				thinkingBudget: 4096,
			},
		}
	}

	const resolvedId = resolveDevStudioModelId(modelId)
	const thinkingLevel =
		resolvedId === 'gemini-3.1-pro-preview'
			? 'high'
			: resolvedId === 'gemini-3.6-flash'
				? 'medium'
				: 'low'

	return {
		thinkingConfig: {
			includeThoughts: true,
			thinkingLevel,
		},
	}
}

function buildDevStudioMessageParts(message: StoredMessage): GeminiPart[] {
	const parts: GeminiPart[] = []

	if (message.content.trim()) {
		parts.push({ text: message.content })
	}

	for (const item of message.media ?? []) {
		if (item.type !== 'image') {
			continue
		}

		const base64 = item.dataUrl.split(',')[1]
		if (!base64) {
			continue
		}

		parts.push({
			inlineData: {
				mimeType: item.mimeType,
				data: base64,
			},
		})
	}

	if (parts.length === 0) {
		parts.push({ text: message.content || ' ' })
	}

	return parts
}

async function generateGeminiDevStudioChat(
	apiKey: string,
	modelId: string,
	messages: StoredMessage[],
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	toolContext: DevStudioToolContext,
	options?: {
		executionMode?: DevStudioExecutionMode
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onThoughtDelta?: (delta: string) => void
		onPhaseChange?: (phase: DevStudioAgentPhase) => void
		onToolStart?: (toolName: string, args: Record<string, unknown>) => void
		onToolComplete?: (toolName: string) => void
	},
): Promise<DevStudioAgentRunResult> {
	const executionMode = options?.executionMode ?? 'act'
	const contents: GeminiContent[] = messages.map((message) => ({
		role: message.role === 'assistant' ? 'model' : 'user',
		parts: buildDevStudioMessageParts(message),
	}))

	const maxIterations = getMaxIterationsForModel(modelId)

	const activeToolDeclarations =
		executionMode === 'plan'
			? DEV_STUDIO_TOOL_DECLARATIONS.filter((tool) =>
					DEV_STUDIO_READ_ONLY_TOOL_NAMES.has(tool.name),
				)
			: [...DEV_STUDIO_TOOL_DECLARATIONS]

	for (let iteration = 0; iteration < maxIterations; iteration += 1) {
		if (options?.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		options?.onPhaseChange?.('thinking')

		const requestBody = applySafetySettingsToRequestBody(
			{
				systemInstruction: {
					parts: [
						{
							text: buildDevStudioSystemInstruction(
								preferences,
								repo,
								executionMode,
							),
						},
					],
				},
				generationConfig: buildDevStudioGenerationConfig(modelId),
				tools: [{ functionDeclarations: activeToolDeclarations }],
				contents,
			},
			preferences.allowMatureContent ?? true,
		)

		const streamed = await geminiStreamGenerateContent(
			apiKey,
			modelId,
			requestBody,
			{
				signal: options?.signal,
				onThoughtDelta: options?.onThoughtDelta,
				onTextDelta: (delta) => {
					options?.onPhaseChange?.('writing')
					options?.onTextDelta?.(delta)
				},
			},
		)

		const parts = streamed.parts
		const functionCallParts = parts.filter((part) => part.functionCall?.name)

		if (functionCallParts.length > 0) {
			options?.onPhaseChange?.('tool')

			contents.push({
				role: streamed.role ?? 'model',
				parts,
			})

			const functionResponseParts: GeminiPart[] = []
			for (const part of functionCallParts) {
				const functionCall = part.functionCall!
				options?.onToolStart?.(
					functionCall.name,
					functionCall.args ?? {},
				)

				const toolResult = await executeDevStudioToolCall(
					functionCall.name,
					functionCall.args ?? {},
					toolContext,
					executionMode,
				)
				options?.onToolComplete?.(functionCall.name)

				functionResponseParts.push({
					functionResponse: {
						name: toolResult.name,
						response: toolResult.response,
					},
				})
			}

			contents.push({
				role: 'user',
				parts: functionResponseParts,
			})
			continue
		}

		const text = parts
			.map((part) => part.text ?? '')
			.join('')
			.trim()

		return {
			status: 'completed',
			text: text || 'Done.',
		}
	}

	return {
		status: 'limit_reached',
		text: DEV_STUDIO_LIMIT_REACHED_MESSAGE,
	}
}

export async function generateDevStudioChat(
	apiKey: string,
	modelId: string,
	messages: StoredMessage[],
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	toolContext: DevStudioToolContext,
	options?: {
		executionMode?: DevStudioExecutionMode
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onThoughtDelta?: (delta: string) => void
		onPhaseChange?: (phase: DevStudioAgentPhase) => void
		onToolStart?: (toolName: string, args: Record<string, unknown>) => void
		onToolComplete?: (toolName: string) => void
	},
): Promise<DevStudioAgentRunResult> {
	const resolvedId = resolveDevStudioModelId(modelId)

	if (getDevStudioModelProvider(resolvedId) === 'openrouter') {
		return generateOpenRouterDevStudioChat(
			apiKey,
			resolvedId,
			messages,
			preferences,
			repo,
			toolContext,
			options,
		)
	}

	return generateGeminiDevStudioChat(
		apiKey,
		resolvedId,
		messages,
		preferences,
		repo,
		toolContext,
		options,
	)
}
