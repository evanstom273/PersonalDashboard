import {
	DEV_STUDIO_READ_ONLY_TOOL_NAMES,
	DEV_STUDIO_TOOL_DECLARATIONS,
	executeDevStudioToolCall,
	type DevStudioToolContext,
} from '@/services/devStudio/devStudioWorkspaceTools'
import {
	getMaxIterationsForModel,
	resolveDevStudioModelId,
} from '@/services/devStudio/devStudioModels'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import {
	buildSystemInstruction,
	getConfiguredAiName,
} from '@/services/gemini/systemInstruction'
import { geminiStreamGenerateContent } from '@/services/gemini/stream'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { DevStudioAgentPhase, DevStudioExecutionMode } from '@/types/devStudio'
import { formatRepositorySlug, type DevStudioRepoRef } from '@/types/devStudio'
import {
	DEV_STUDIO_LIMIT_REACHED_MESSAGE,
	type DevStudioAgentRunResult,
} from '@/services/devStudio/devStudioAgentTypes'

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

function buildDevStudioSystemInstruction(
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	executionMode: DevStudioExecutionMode = 'act',
): string {
	const base = [
		buildSystemInstruction(preferences),
		`${getConfiguredAiName(preferences)} Dev Studio code agent mode.`,
		`Connected repository: ${formatRepositorySlug(repo)} on branch ${repo.branch}.`,
	]

	if (executionMode === 'plan') {
		return [
			...base,
			'CURRENT EXECUTION MODE: PLAN MODE 📝',
			'You are in read-only analysis and planning mode. Do NOT attempt to stage code changes or edit workspace files.',
			'Restricted tools: stage_workspace_file, push_staged_changes, merge_pull_request, close_pull_request are write-protected.',
			'Use workspace inspection tools (list_workspace_files, read_workspace_file, search_workspace_code, list_staged_changes) to diagnose the codebase.',
			'Output a standardized, clear Markdown plan formatted as follows:',
			'# Dev Studio Execution Plan',
			'## 🔍 Problem Diagnosis / Objective',
			'## 🏗️ Architectural Strategy & Touched Files',
			'## ⚠️ Edge Cases, Safety & Risks',
			'## 🧪 Verification & Testing Steps',
			'End your response with a clear summary asking the user to review, download, or approve the plan to switch to Act Mode.',
		].join('\n\n')
	}

	return [
		...base,
		'CURRENT EXECUTION MODE: ACT MODE ⚡',
		'Use workspace tools to inspect and edit files in this repository.',
		'Think step by step before editing. Read files before changing them.',
		'Stage file edits with stage_workspace_file for user review in Diff before push.',
		'Pull request tools: list_pull_requests, push_staged_changes, merge_pull_request, close_pull_request.',
		'Only call push_staged_changes, merge_pull_request, or close_pull_request when the user explicitly asks.',
		'When pushing, either write a concise commit_message and pull_request_title describing your staged edits, or omit them to auto-generate from the changed files and current time.',
		'Prefer small, focused changes. When proposing code, stage the full updated file content.',
		'For multi-file work: list or search first, read each file, then stage edits one file at a time.',
		'When you believe the task is fully done and staged changes are ready for human review, end with a clear summary and the phrase "Task ready for review."',
	].join('\n\n')
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
