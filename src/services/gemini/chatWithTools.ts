import { executeDocumentToolCall, DOCUMENT_TOOL_DECLARATIONS } from '@/services/gemini/documentTools'
import { buildFullSystemInstruction } from '@/services/gemini/documentContext'
import {
	extractGroundingMetadata,
	formatGroundedResponseText,
	type GroundingMetadata,
} from '@/services/gemini/grounding'
import type { ChatMessageInput } from '@/services/gemini/generate'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import { geminiStreamGenerateContent } from '@/services/gemini/stream'
import type { MessageMedia, PendingDeleteConfirmation, UserPreferences } from '@/storage/types'
import type { MessageDocumentLink } from '@/storage/types'
import { formatMessageForModel } from '@/utils/dateTime'
import {
	extractDocumentLinkFromToolResult,
	mergeDocumentLinks,
} from '@/utils/messageAttachments'

interface GeminiPart {
	text?: string
	thoughtSignature?: string
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

export interface ChatWithToolsResult {
	text: string
	media: MessageMedia[]
	documentLinks: MessageDocumentLink[]
	pendingDeleteConfirmation?: PendingDeleteConfirmation
}

const MAX_TOOL_ITERATIONS = 8

export async function generateChatWithTools(
	apiKey: string,
	modelId: string,
	messages: ChatMessageInput[],
	preferences: UserPreferences,
	options?: {
		useWebSearch?: boolean
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onToolActivity?: () => void
	},
): Promise<ChatWithToolsResult> {
	const contents: GeminiContent[] = messages.map((message) => ({
		role: message.role === 'assistant' ? 'model' : 'user',
		parts: buildMessageParts(message),
	}))

	let pendingDeleteConfirmation: PendingDeleteConfirmation | undefined
	let documentLinks: MessageDocumentLink[] = []
	const useWebSearch = options?.useWebSearch ?? false

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
		if (options?.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		const requestBody: Record<string, unknown> = applySafetySettingsToRequestBody(
			{
				systemInstruction: {
					parts: [{ text: await buildFullSystemInstruction(preferences) }],
				},
				tools: buildChatTools(useWebSearch),
				contents,
			},
			preferences.allowMatureContent ?? true,
		)

		if (useWebSearch) {
			requestBody.toolConfig = {
				includeServerSideToolInvocations: true,
			}
		}

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
			options?.onToolActivity?.()

			contents.push({
				role: streamed.role ?? 'model',
				parts,
			})

			const functionResponseParts: GeminiPart[] = []

			for (const part of functionCallParts) {
				const functionCall = part.functionCall!
				const toolResult = await executeDocumentToolCall(
					functionCall.name,
					functionCall.args ?? {},
				)

				if (toolResult.pendingDeleteConfirmation) {
					pendingDeleteConfirmation = toolResult.pendingDeleteConfirmation
				}

				const documentLink = extractDocumentLinkFromToolResult(
					functionCall.name,
					toolResult.response,
				)
				if (documentLink) {
					documentLinks = mergeDocumentLinks(documentLinks, [documentLink])
				}

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
			.join('\n')
			.trim()

		const groundedText = formatGroundedResponseText(
			text || 'Done.',
			extractGroundingMetadata({
				groundingMetadata: streamed.groundingMetadata as GroundingMetadata | undefined,
			}),
		)

		return {
			text: groundedText,
			media: [],
			documentLinks,
			pendingDeleteConfirmation,
		}
	}

	return {
		text: 'I completed the requested document actions.',
		media: [],
		documentLinks,
		pendingDeleteConfirmation,
	}
}

function buildMessageParts(message: ChatMessageInput): GeminiPart[] {
	const parts: GeminiPart[] = []
	const body =
		typeof message.createdAt === 'number'
			? formatMessageForModel(message.content, message.createdAt, message.role)
			: message.content

	if (body.trim()) {
		parts.push({ text: body })
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
		parts.push({ text: body || ' ' })
	}

	return parts
}

function buildChatTools(useWebSearch: boolean): Array<Record<string, unknown>> {
	if (useWebSearch) {
		return [
			{
				googleSearch: {},
				functionDeclarations: DOCUMENT_TOOL_DECLARATIONS,
			},
		]
	}

	return [{ functionDeclarations: DOCUMENT_TOOL_DECLARATIONS }]
}
