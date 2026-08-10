import type { GenerationIntent } from '@/services/gemini/constants'
import type { UserPreferences } from '@/storage/types'

export interface GenerationModelPreferences {
	chatModelId: string
	imageModelId: string
	musicModelId: string
	videoModelId: string
}

export function getGenerationModelPreferences(
	preferences: UserPreferences,
): GenerationModelPreferences {
	return {
		chatModelId: preferences.defaultModelId,
		imageModelId: preferences.defaultImageModelId,
		musicModelId: preferences.defaultMusicModelId,
		videoModelId: preferences.defaultVideoModelId,
	}
}

export function getModelIdForIntent(
	intent: 'chat' | GenerationIntent,
	models: GenerationModelPreferences,
): string {
	switch (intent) {
		case 'chat':
			return models.chatModelId
		case 'image':
			return models.imageModelId
		case 'music':
			return models.musicModelId
		case 'video':
			return models.videoModelId
	}
}
