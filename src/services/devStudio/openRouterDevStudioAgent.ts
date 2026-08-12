import { buildDevStudioSystemInstruction, buildDevStudioUserText } from '@/services/devStudio/devStudioAgentPrompt'
import {
	DEV_STUDIO_LIMIT_REACHED_MESSAGE,
	type DevStudioAgentRunResult,
} from '@/services/devStudio/devStudioAgentTypes'
import {
	getMaxIterationsForModel,
	resolveOpenRouterModelId,
} from '@/services/devStudio/devStudioModels'
import {
	DEV_STUDIO_READ_ONLY_TOOL_NAMES,
	DEV_STUDIO_TOOL_DECLARATIONS,
	executeDevStudioToolCall,
	type DevStudioToolContext,
} from '@/services/devStudio/devStudioWorkspaceTools'
import {
	openRouterStreamChatCompletion,
	type OpenRouterToolCall,
} from '@/services/openrouter/openRouterStream'
import { convertDevStudioToolsToOpenAi } from '@/services/openrouter/openRouterTools'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { DevStudioAgentPhase, DevStudioExecutionMode } from '@/types/devStudio'
import type { DevStudioRepoRef } from '@/types/devStudio'

type OpenRouterMessage =
	| {
			role: 'system' | 'user' | 'assistant'
			content: string | OpenRouterContentPart[]
	  }
	| {
			role: 'assistant'
			content: string | null
			tool_calls: Array<{
				id: string
				type: 'function'
				function: {
					name: string
					arguments: string
				}
			}>
	  }
	| {
			role: 'tool'
			tool_call_id: string
			content: string
	  }

type OpenRouterContentPart =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: { url: string } }

function buildInitialOpenRouterMessages(
	messages: StoredMessage[],
): OpenRouterMessage[] {
	return messages.map((message) => {
		const text = buildDevStudioUserText(message)
		const imageParts =
			message.media
				?.filter((item) => item.type === 'image' && item.dataUrl)
				.map((item) => ({
					type: 'image_url' as const,
					image_url: { url: item.dataUrl },
				})) ?? []

		if (imageParts.length === 0) {
			return {
				role: message.role === 'assistant' ? 'assistant' : 'user',
				content: text,
			}
		}

		return {
			role: 'user',
			content: [{ type: 'text', text }, ...imageParts],
		}
	})
}

function toAssistantToolCallMessage(
	text: string,
	toolCalls: OpenRouterToolCall[],
): OpenRouterMessage {
	return {
		role: 'assistant',
		content: text || null,
		tool_calls: toolCalls.map((toolCall) => ({
			id: toolCall.id,
			type: 'function',
			function: {
				name: toolCall.name,
				arguments: JSON.stringify(toolCall.arguments),
			},
		})),
	}
}

export async function generateOpenRouterDevStudioChat(
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
	const openRouterModel = resolveOpenRouterModelId(modelId)
	const maxIterations = getMaxIterationsForModel(modelId)

	const activeToolDeclarations =
		executionMode === 'plan'
			? DEV_STUDIO_TOOL_DECLARATIONS.filter((tool) =>
					DEV_STUDIO_READ_ONLY_TOOL_NAMES.has(tool.name),
				)
			: [...DEV_STUDIO_TOOL_DECLARATIONS]

	const tools = convertDevStudioToolsToOpenAi(activeToolDeclarations)
	const conversation: OpenRouterMessage[] = buildInitialOpenRouterMessages(messages)

	for (let iteration = 0; iteration < maxIterations; iteration += 1) {
		if (options?.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		options?.onPhaseChange?.('thinking')

		const result = await openRouterStreamChatCompletion(
			apiKey,
			openRouterModel,
			{
				messages: [
					{
						role: 'system',
						content: buildDevStudioSystemInstruction(
							preferences,
							repo,
							executionMode,
						),
					},
					...conversation,
				],
				tools,
				tool_choice: 'auto',
			},
			{
				signal: options?.signal,
				onThoughtDelta: options?.onThoughtDelta,
				onTextDelta: (delta) => {
					options?.onPhaseChange?.('writing')
					options?.onTextDelta?.(delta)
				},
			},
		)

		if (result.toolCalls.length > 0) {
			options?.onPhaseChange?.('tool')
			conversation.push(toAssistantToolCallMessage(result.text, result.toolCalls))

			for (const toolCall of result.toolCalls) {
				options?.onToolStart?.(toolCall.name, toolCall.arguments)

				const toolResult = await executeDevStudioToolCall(
					toolCall.name,
					toolCall.arguments,
					toolContext,
					executionMode,
				)
				options?.onToolComplete?.(toolCall.name)

				conversation.push({
					role: 'tool',
					tool_call_id: toolCall.id,
					content: JSON.stringify(toolResult.response),
				})
			}

			continue
		}

		return {
			status: 'completed',
			text: result.text || 'Done.',
		}
	}

	return {
		status: 'limit_reached',
		text: DEV_STUDIO_LIMIT_REACHED_MESSAGE,
	}
}
