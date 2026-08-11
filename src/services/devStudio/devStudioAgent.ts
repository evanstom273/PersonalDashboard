import {
	DEV_STUDIO_TOOL_DECLARATIONS,
	executeDevStudioToolCall,
	type DevStudioToolContext,
} from '@/services/devStudio/devStudioWorkspaceTools'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import {
	buildSystemInstruction,
	getConfiguredAiName,
} from '@/services/gemini/systemInstruction'
import { geminiStreamGenerateContent } from '@/services/gemini/stream'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import { formatRepositorySlug, type DevStudioRepoRef } from '@/types/devStudio'

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
}

interface GeminiContent {
	role?: string
	parts: GeminiPart[]
}

const MAX_TOOL_ITERATIONS = 12

function buildDevStudioSystemInstruction(
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
): string {
	return [
		buildSystemInstruction(preferences),
		`${getConfiguredAiName(preferences)} Dev Studio code agent mode.`,
		`Connected repository: ${formatRepositorySlug(repo)} on branch ${repo.branch}.`,
		'Use workspace tools to inspect and edit files in this repository only.',
		'Stage file edits with stage_workspace_file for user review in Diff before push.',
		'Pull request tools: list_pull_requests, push_staged_changes, merge_pull_request, close_pull_request.',
		'Only call push_staged_changes, merge_pull_request, or close_pull_request when the user explicitly asks.',
		'Prefer small, focused changes. Read files before editing them.',
		'When proposing code, stage the full updated file content.',
	].join('\n\n')
}

export async function generateDevStudioChat(
	apiKey: string,
	modelId: string,
	messages: StoredMessage[],
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	toolContext: DevStudioToolContext,
	options?: {
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onToolActivity?: (label: string) => void
	},
): Promise<string> {
	const contents: GeminiContent[] = messages.map((message) => ({
		role: message.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: message.content }],
	}))

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
		if (options?.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		const requestBody = applySafetySettingsToRequestBody(
			{
				systemInstruction: {
					parts: [{ text: buildDevStudioSystemInstruction(preferences, repo) }],
				},
				tools: [{ functionDeclarations: [...DEV_STUDIO_TOOL_DECLARATIONS] }],
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
				onTextDelta: options?.onTextDelta,
			},
		)

		const parts = streamed.parts
		const functionCallParts = parts.filter((part) => part.functionCall?.name)

		if (functionCallParts.length > 0) {
			for (const part of functionCallParts) {
				options?.onToolActivity?.(part.functionCall!.name)
			}

			contents.push({
				role: streamed.role ?? 'model',
				parts,
			})

			const functionResponseParts: GeminiPart[] = []
			for (const part of functionCallParts) {
				const functionCall = part.functionCall!
				const toolResult = await executeDevStudioToolCall(
					functionCall.name,
					functionCall.args ?? {},
					toolContext,
				)
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

		return text || 'Done.'
	}

	return 'I reached the tool iteration limit. Try a narrower request.'
}
