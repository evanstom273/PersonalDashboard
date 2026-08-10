import { geminiFetch, pollOperation, toDataUrl } from '@/services/gemini/client'
import type { MessageMedia } from '@/storage/types'

export interface ChatMessageInput {
	role: 'user' | 'assistant'
	content: string
	media?: MessageMedia[]
	createdAt?: number
}

interface GenerateContentResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				text?: string
				inlineData?: {
					mimeType: string
					data: string
				}
			}>
		}
		finishReason?: string
	}>
	promptFeedback?: {
		blockReason?: string
	}
}

function buildChatParts(message: ChatMessageInput): Array<{
	text?: string
	inlineData?: { mimeType: string; data: string }
}> {
	const parts: Array<{
		text?: string
		inlineData?: { mimeType: string; data: string }
	}> = []

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

export async function generateChatResponse(
	apiKey: string,
	modelId: string,
	messages: ChatMessageInput[],
): Promise<{ text: string; media: MessageMedia[] }> {
	const response = await geminiFetch<GenerateContentResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify({
				contents: messages.map((message) => ({
					role: message.role === 'assistant' ? 'model' : 'user',
					parts: buildChatParts(message),
				})),
			}),
		},
	)

	return parseContentResponse(response)
}

export async function generateImage(
	apiKey: string,
	modelId: string,
	prompt: string,
): Promise<{ text: string; media: MessageMedia[] }> {
	const trimmedPrompt = prompt.trim()
	const imagePrompt = /\b(generate|create|make|draw|render)\b/i.test(trimmedPrompt)
		? trimmedPrompt
		: `Generate an image: ${trimmedPrompt}`

	const response = await geminiFetch<GenerateContentResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify({
				contents: [
					{
						role: 'user',
						parts: [{ text: imagePrompt }],
					},
				],
				generationConfig: {
					responseModalities: ['TEXT', 'IMAGE'],
				},
			}),
		},
	)

	const parsed = parseContentResponse(response)

	if (parsed.media.length === 0) {
		const finishReason = response.candidates?.[0]?.finishReason
		const blockReason = response.promptFeedback?.blockReason
		const detail = finishReason
			? `Finish reason: ${finishReason}.`
			: blockReason
				? `Blocked: ${blockReason}.`
				: 'The image model returned text only.'

		throw new Error(
			`Image generation did not return a file. ${detail} Start your message with "generate an image of…" and confirm your image model in the + menu.`,
		)
	}

	return parsed
}

export async function generateMusic(
	apiKey: string,
	modelId: string,
	prompt: string,
): Promise<{ text: string; media: MessageMedia[] }> {
	const response = await geminiFetch<GenerateContentResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify({
				contents: [
					{
						role: 'user',
						parts: [{ text: prompt }],
					},
				],
				generationConfig: {
					responseModalities: ['TEXT', 'AUDIO'],
				},
			}),
		},
	)

	return parseContentResponse(response)
}

interface PredictLongRunningResponse {
	name?: string
}

interface GeneratedVideoSample {
	video?: {
		uri?: string
	}
}

interface VideoOperationResponse {
	generateVideoResponse?: {
		generatedSamples?: GeneratedVideoSample[]
	}
	generatedVideos?: GeneratedVideoSample[]
}

function extractVideoUri(result: VideoOperationResponse): string | undefined {
	const fromSamples =
		result.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
	if (fromSamples) {
		return fromSamples
	}

	return result.generatedVideos?.[0]?.video?.uri
}

export async function generateVideo(
	apiKey: string,
	modelId: string,
	prompt: string,
): Promise<{ text: string; media: MessageMedia[] }> {
	const trimmedPrompt = prompt.trim()
	const videoPrompt = /\b(generate|create|make|animate|video|clip|animation)\b/i.test(
		trimmedPrompt,
	)
		? trimmedPrompt
		: `Generate a video: ${trimmedPrompt}`

	const started = await geminiFetch<PredictLongRunningResponse>(
		apiKey,
		`/models/${modelId}:predictLongRunning`,
		{
			method: 'POST',
			body: JSON.stringify({
				instances: [{ prompt: videoPrompt }],
			}),
		},
	)

	if (!started.name) {
		throw new Error('Video generation did not return an operation name')
	}

	const result = await pollOperation<VideoOperationResponse>(
		apiKey,
		started.name,
	)

	const videoUri = extractVideoUri(result)
	if (!videoUri) {
		throw new Error(
			'Video generation completed but no video URI was returned. The model may have filtered the output — try a simpler prompt or check your API access for Veo.',
		)
	}

	const videoResponse = await fetch(videoUri, {
		headers: {
			'x-goog-api-key': apiKey,
		},
		redirect: 'follow',
	})
	if (!videoResponse.ok) {
		throw new Error(
			`Failed to download generated video (${videoResponse.status}).`,
		)
	}

	const blob = await videoResponse.blob()
	const dataUrl = await blobToDataUrl(blob)

	return {
		text: 'Generated video:',
		media: [
			{
				type: 'video',
				mimeType: blob.type || 'video/mp4',
				dataUrl,
			},
		],
	}
}

function parseContentResponse(response: GenerateContentResponse): {
	text: string
	media: MessageMedia[]
} {
	const parts = response.candidates?.[0]?.content?.parts ?? []
	const textParts: string[] = []
	const media: MessageMedia[] = []

	for (const part of parts) {
		if (part.text) {
			textParts.push(part.text)
		}

		if (part.inlineData) {
			const mimeType = part.inlineData.mimeType
			const dataUrl = toDataUrl(mimeType, part.inlineData.data)

			if (mimeType.startsWith('image/')) {
				media.push({ type: 'image', mimeType, dataUrl })
			} else if (mimeType.startsWith('audio/')) {
				media.push({ type: 'audio', mimeType, dataUrl })
			} else if (mimeType.startsWith('video/')) {
				media.push({ type: 'video', mimeType, dataUrl })
			}
		}
	}

	return {
		text: textParts.join('\n').trim() || 'Generation completed.',
		media,
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result)
			} else {
				reject(new Error('Failed to read blob'))
			}
		}
		reader.onerror = () => reject(new Error('Failed to read blob'))
		reader.readAsDataURL(blob)
	})
}
