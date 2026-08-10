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

export async function ensureMicrophonePermission(): Promise<
	{ ok: true } | { ok: false; message: string }
> {
	if (!navigator.mediaDevices?.getUserMedia) {
		return { ok: true }
	}

	try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
		for (const track of stream.getTracks()) {
			track.stop()
		}
		return { ok: true }
	} catch (error) {
		const name =
			error instanceof DOMException
				? error.name
				: error instanceof Error
					? error.name
					: 'UnknownError'

		if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
			return {
				ok: false,
				message:
					'Microphone access was denied. Allow the mic in your browser or app settings, then try again.',
			}
		}

		if (name === 'NotFoundError') {
			return {
				ok: false,
				message: 'No microphone was found on this device.',
			}
		}

		return {
			ok: false,
			message: 'Could not access the microphone.',
		}
	}
}

export function getSpeechRecognitionErrorMessage(error: string): string {
	switch (error) {
		case 'not-allowed':
		case 'service-not-allowed':
			return 'Microphone or speech recognition is blocked. Allow access in app settings or try Chrome.'
		case 'audio-capture':
			return 'Could not capture audio. Check that no other app is using the microphone.'
		case 'network':
			return 'Speech recognition needs an internet connection.'
		case 'no-speech':
			return 'No speech was detected. Try speaking closer to the microphone.'
		default:
			return `Speech recognition error: ${error}`
	}
}
