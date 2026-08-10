import { geminiFetch } from '@/services/gemini/client'
import { executeDocumentToolCall, DOCUMENT_TOOL_DECLARATIONS } from '@/services/gemini/documentTools'
import { buildSystemInstruction } from '@/services/gemini/systemInstruction'
import type { ChatMessageInput } from '@/services/gemini/generate'
import type { MessageMedia, PendingDeleteConfirmation, UserPreferences } from '@/storage/types'

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

interface GenerateContentResponse {
	candidates?: Array<{
		content?: GeminiContent
	}>
}

export interface ChatWithToolsResult {
	text: string
	media: MessageMedia[]
	pendingDeleteConfirmation?: PendingDeleteConfirmation
}

const MAX_TOOL_ITERATIONS = 8

export async function generateChatWithTools(
	apiKey: string,
	modelId: string,
	messages: ChatMessageInput[],
	preferences: UserPreferences,
): Promise<ChatWithToolsResult> {
	const contents: GeminiContent[] = messages.map((message) => ({
		role: message.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: message.content }],
	}))

	let pendingDeleteConfirmation: PendingDeleteConfirmation | undefined

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
		const response = await geminiFetch<GenerateContentResponse>(
			apiKey,
			`/models/${modelId}:generateContent`,
			{
				method: 'POST',
				body: JSON.stringify({
					systemInstruction: {
						parts: [{ text: buildSystemInstruction(preferences) }],
					},
					tools: [{ functionDeclarations: DOCUMENT_TOOL_DECLARATIONS }],
					contents,
				}),
			},
		)

		const modelContent = response.candidates?.[0]?.content
		const parts = modelContent?.parts ?? []

		const functionCallParts = parts.filter(
			(part) => part.functionCall?.name,
		)

		if (functionCallParts.length > 0) {
			// Preserve the full model response (including thoughtSignature on
			// functionCall parts). Rebuilding parts strips required signatures.
			contents.push({
				role: modelContent?.role ?? 'model',
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

		return {
			text: text || 'Done.',
			media: [],
			pendingDeleteConfirmation,
		}
	}

	return {
		text: 'I completed the requested document actions.',
		media: [],
		pendingDeleteConfirmation,
	}
}
