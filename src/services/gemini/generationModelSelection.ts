import type { GenerationIntent } from '@/services/gemini/constants'

const IMAGE_MODELS = {
	pro: 'gemini-3-pro-image',
	standard: 'gemini-3.1-flash-image',
	lite: 'gemini-3.1-flash-lite-image',
} as const

const MUSIC_MODELS = {
	pro: 'lyria-3-pro-preview',
	clip: 'lyria-3-clip-preview',
} as const

const VIDEO_MODELS = {
	full: 'veo-3.1-generate-preview',
	lite: 'veo-3.1-lite-generate-preview',
} as const

const IMAGE_PRO_KEYWORDS =
	/\b(hyper-?realistic|photorealistic|8k|4k|cinematic|high-?fidelity|professional|intricate|detailed|ultra|studio quality|product shot|commercial|editorial|high quality|high-quality|nano banana pro)\b/i

const IMAGE_LITE_KEYWORDS =
	/\b(simple|basic|quick|icon|logo|sketch|doodle|minimal|placeholder|thumbnail|emoji|stick figure|flat|lite)\b/i

const MUSIC_CLIP_KEYWORDS =
	/\b(clip|jingle|snippet|short|30 sec(?:ond)?s?|ringtone|intro|outro|stinger|loop|brief)\b/i

const MUSIC_FULL_KEYWORDS =
	/\b(full|complete|entire|album|soundtrack|ballad|anthem|symphony|score)\b/i

const VIDEO_LITE_KEYWORDS =
	/\b(simple|quick|short|lite|basic|minimal|brief|gif-?like)\b/i

const VIDEO_FULL_KEYWORDS =
	/\b(cinematic|synced audio|complex|professional|4k|story|scene|full length|high quality|high-quality)\b/i

export function selectGenerationModel(
	intent: GenerationIntent,
	prompt: string,
): string {
	const normalized = prompt.trim()
	const lower = normalized.toLowerCase()
	const length = normalized.length

	switch (intent) {
		case 'image': {
			if (IMAGE_PRO_KEYWORDS.test(lower) || length > 280) {
				return IMAGE_MODELS.pro
			}
			if (
				IMAGE_LITE_KEYWORDS.test(lower) ||
				(length <= 60 && !IMAGE_PRO_KEYWORDS.test(lower))
			) {
				return IMAGE_MODELS.lite
			}
			return IMAGE_MODELS.standard
		}
		case 'music': {
			if (MUSIC_CLIP_KEYWORDS.test(lower)) {
				return MUSIC_MODELS.clip
			}
			if (MUSIC_FULL_KEYWORDS.test(lower) || length > 160) {
				return MUSIC_MODELS.pro
			}
			return length <= 80 ? MUSIC_MODELS.clip : MUSIC_MODELS.pro
		}
		case 'video': {
			if (VIDEO_FULL_KEYWORDS.test(lower) || length > 220) {
				return VIDEO_MODELS.full
			}
			if (VIDEO_LITE_KEYWORDS.test(lower) || length <= 90) {
				return VIDEO_MODELS.lite
			}
			return VIDEO_MODELS.lite
		}
	}
}
