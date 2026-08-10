export type GeminiHarmCategory =
	| 'HARM_CATEGORY_HARASSMENT'
	| 'HARM_CATEGORY_HATE_SPEECH'
	| 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
	| 'HARM_CATEGORY_DANGEROUS_CONTENT'
	| 'HARM_CATEGORY_CIVIC_INTEGRITY'

export interface GeminiSafetySetting {
	category: GeminiHarmCategory
	threshold: 'OFF'
}

const PERMISSIVE_HARM_CATEGORIES: GeminiHarmCategory[] = [
	'HARM_CATEGORY_HARASSMENT',
	'HARM_CATEGORY_HATE_SPEECH',
	'HARM_CATEGORY_SEXUALLY_EXPLICIT',
	'HARM_CATEGORY_DANGEROUS_CONTENT',
	'HARM_CATEGORY_CIVIC_INTEGRITY',
]

export function getPermissiveSafetySettings(): GeminiSafetySetting[] {
	return PERMISSIVE_HARM_CATEGORIES.map((category) => ({
		category,
		threshold: 'OFF',
	}))
}

export function applySafetySettingsToRequestBody(
	body: Record<string, unknown>,
	allowMatureContent: boolean,
): Record<string, unknown> {
	if (!allowMatureContent) {
		return body
	}

	return {
		...body,
		safetySettings: getPermissiveSafetySettings(),
	}
}

export type PersonGenerationSetting = 'ALLOW_ADULT'

export function getPermissiveImageConfig(): {
	personGeneration: PersonGenerationSetting
} {
	return { personGeneration: 'ALLOW_ADULT' }
}

export function applyImageGenerationRequestBody(
	body: Record<string, unknown>,
	allowMatureContent: boolean,
): Record<string, unknown> {
	const withSafety = applySafetySettingsToRequestBody(body, allowMatureContent)
	if (!allowMatureContent) {
		return withSafety
	}

	const generationConfig = (withSafety.generationConfig ?? {}) as Record<
		string,
		unknown
	>
	const imageConfig = (generationConfig.imageConfig ?? {}) as Record<
		string,
		unknown
	>

	return {
		...withSafety,
		generationConfig: {
			...generationConfig,
			imageConfig: {
				...imageConfig,
				...getPermissiveImageConfig(),
			},
		},
	}
}
