export class OpenRouterApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'OpenRouterApiError'
		this.status = status
	}
}

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

export interface OpenRouterStreamCallbacks {
	signal?: AbortSignal
	onTextDelta?: (delta: string) => void
	onThoughtDelta?: (delta: string) => void
}

export interface OpenRouterToolCall {
	id: string
	name: string
	arguments: Record<string, unknown>
}

export interface OpenRouterCompletionResult {
	text: string
	toolCalls: OpenRouterToolCall[]
}

interface OpenRouterStreamDeltaToolCall {
	index?: number
	id?: string
	type?: string
	function?: {
		name?: string
		arguments?: string
	}
}

interface OpenRouterStreamChoice {
	delta?: {
		content?: string | null
		reasoning?: string | null
		reasoning_content?: string | null
		tool_calls?: OpenRouterStreamDeltaToolCall[]
	}
}

function getReferer(): string {
	if (typeof window !== 'undefined' && window.location.origin) {
		return window.location.origin
	}
	return 'https://github.com/evanstom273/personal-ai'
}

function parseToolArguments(raw: string): Record<string, unknown> {
	if (!raw.trim()) {
		return {}
	}

	try {
		const parsed = JSON.parse(raw) as unknown
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>
		}
	} catch {
		// fall through
	}

	return { raw }
}

export async function openRouterStreamChatCompletion(
	apiKey: string,
	model: string,
	body: Record<string, unknown>,
	callbacks?: OpenRouterStreamCallbacks,
): Promise<OpenRouterCompletionResult> {
	const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': getReferer(),
			'X-Title': 'Personal AI Dev Studio',
		},
		body: JSON.stringify({
			...body,
			model,
			stream: true,
		}),
		signal: callbacks?.signal,
	})

	if (!response.ok) {
		let message = `OpenRouter API request failed (${response.status})`
		try {
			const errorBody = (await response.json()) as {
				error?: { message?: string }
			}
			if (errorBody.error?.message) {
				message = errorBody.error.message
			}
		} catch {
			// ignore parse errors
		}
		if (message.includes('No endpoints found')) {
			message = `${message} The model may have been removed from OpenRouter's free tier. Try another Dev Studio model or check openrouter.ai/models.`
		}
		throw new OpenRouterApiError(message, response.status)
	}

	if (!response.body) {
		throw new OpenRouterApiError('Streaming response had no body', 500)
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	let text = ''
	const toolCallParts = new Map<number, { id: string; name: string; arguments: string }>()

	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			break
		}

		buffer += decoder.decode(value, { stream: true })

		while (true) {
			const lineEnd = buffer.indexOf('\n')
			if (lineEnd < 0) {
				break
			}

			const line = buffer.slice(0, lineEnd).trim()
			buffer = buffer.slice(lineEnd + 1)

			if (!line.startsWith('data:')) {
				continue
			}

			const payload = line.slice(5).trim()
			if (!payload || payload === '[DONE]') {
				continue
			}

			let parsed: { choices?: OpenRouterStreamChoice[] }
			try {
				parsed = JSON.parse(payload) as { choices?: OpenRouterStreamChoice[] }
			} catch {
				continue
			}

			const delta = parsed.choices?.[0]?.delta
			if (!delta) {
				continue
			}

			if (delta.content) {
				text += delta.content
				callbacks?.onTextDelta?.(delta.content)
			}

			const reasoningDelta = delta.reasoning ?? delta.reasoning_content
			if (reasoningDelta) {
				callbacks?.onThoughtDelta?.(reasoningDelta)
			}

			for (const toolCall of delta.tool_calls ?? []) {
				const index = toolCall.index ?? 0
				const existing = toolCallParts.get(index) ?? {
					id: toolCall.id ?? '',
					name: toolCall.function?.name ?? '',
					arguments: '',
				}

				if (toolCall.id) {
					existing.id = toolCall.id
				}
				if (toolCall.function?.name) {
					existing.name = toolCall.function.name
				}
				if (toolCall.function?.arguments) {
					existing.arguments += toolCall.function.arguments
				}

				toolCallParts.set(index, existing)
			}
		}
	}

	const toolCalls = [...toolCallParts.entries()]
		.sort(([left], [right]) => left - right)
		.map(([, toolCall]) => ({
			id: toolCall.id || crypto.randomUUID(),
			name: toolCall.name,
			arguments: parseToolArguments(toolCall.arguments),
		}))
		.filter((toolCall) => toolCall.name)

	return {
		text: text.trim(),
		toolCalls,
	}
}
