export function getSpeechRecognitionConstructor():
	| SpeechRecognitionConstructor
	| null {
	if (typeof window === 'undefined') {
		return null
	}

	return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
	return getSpeechRecognitionConstructor() !== null
}
