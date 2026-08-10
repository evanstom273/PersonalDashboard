import {
	generateChatResponse,
	generateImage,
	generateMusic,
	type ChatMessageInput,
} from '@/services/gemini/generate'
import { getModelById } from '@/services/gemini/models'
import type { MessageMedia } from '@/storage/types'

export interface GenerationResult {
	text: string
	media: MessageMedia[]
}

export async function runModelGeneration(
	apiKey: string,
	modelId: string,
	prompt: string,
	history: ChatMessageInput[],
): Promise<GenerationResult> {
	const model = getModelById(modelId)
	if (!model) {
		throw new Error(`Unknown model: ${modelId}`)
	}

	switch (model.category) {
		case 'chat':
			return generateChatResponse(apiKey, modelId, [
				...history,
				{ role: 'user', content: prompt },
			])
		case 'image':
			return generateImage(apiKey, modelId, prompt)
		case 'music':
			return generateMusic(apiKey, modelId, prompt)
		default: {
			const exhaustiveCheck: never = model.category
			throw new Error(`Unsupported model category: ${exhaustiveCheck}`)
		}
	}
}
