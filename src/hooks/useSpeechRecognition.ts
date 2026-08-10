import { useCallback, useEffect, useRef, useState } from 'react'
import {
	getSpeechRecognitionConstructor,
	isSpeechRecognitionSupported,
} from '@/utils/speechRecognition'

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'review'

interface UseSpeechRecognitionOptions {
	onTranscriptChange?: (transcript: string) => void
}

interface UseSpeechRecognitionResult {
	isSupported: boolean
	status: SpeechRecognitionStatus
	transcript: string
	error: string | null
	startListening: (baseText?: string) => void
	continueListening: () => void
	cancelListening: () => void
}

export function useSpeechRecognition(
	options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionResult {
	const { onTranscriptChange } = options
	const [isSupported] = useState(isSpeechRecognitionSupported)
	const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')
	const [transcript, setTranscript] = useState('')
	const [error, setError] = useState<string | null>(null)

	const recognitionRef = useRef<SpeechRecognition | null>(null)
	const committedRef = useRef('')
	const baseTextRef = useRef('')

	const updateTranscript = useCallback(
		(next: string) => {
			setTranscript(next)
			onTranscriptChange?.(next)
		},
		[onTranscriptChange],
	)

	const stopRecognition = useCallback(() => {
		recognitionRef.current?.stop()
		recognitionRef.current = null
	}, [])

	const cancelListening = useCallback(() => {
		stopRecognition()
		committedRef.current = ''
		baseTextRef.current = ''
		setError(null)
		setStatus('idle')
		updateTranscript('')
	}, [stopRecognition, updateTranscript])

	const continueListening = useCallback(() => {
		stopRecognition()
		setStatus('review')
		setError(null)
	}, [stopRecognition])

	const startListening = useCallback(
		(baseText = '') => {
			const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
			if (!SpeechRecognitionCtor) {
				setError('Speech recognition is not supported in this browser.')
				return
			}

			stopRecognition()

			const trimmedBase = baseText.trim()
			baseTextRef.current = trimmedBase
			committedRef.current = trimmedBase
			updateTranscript(trimmedBase)
			setError(null)
			setStatus('listening')

			const recognition = new SpeechRecognitionCtor()
			recognition.continuous = true
			recognition.interimResults = true
			recognition.lang = navigator.language || 'en-US'

			recognition.onresult = (event: SpeechRecognitionEvent) => {
				let interim = ''

				for (let index = event.resultIndex; index < event.results.length; index += 1) {
					const result = event.results[index]
					const spoken = result[0]?.transcript ?? ''

					if (result.isFinal) {
						committedRef.current = joinTranscriptParts(
							committedRef.current,
							spoken,
						)
					} else {
						interim = joinTranscriptParts(interim, spoken)
					}
				}

				updateTranscript(
					joinTranscriptParts(committedRef.current, interim),
				)
			}

			recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
				if (event.error === 'aborted' || event.error === 'no-speech') {
					return
				}

				setError(event.message || `Speech recognition error: ${event.error}`)
				setStatus('review')
				stopRecognition()
			}

			recognition.onend = () => {
				if (recognitionRef.current === recognition) {
					recognitionRef.current = null
				}
			}

			recognitionRef.current = recognition

			try {
				recognition.start()
			} catch (startError) {
				setError(
					startError instanceof Error
						? startError.message
						: 'Could not start speech recognition.',
				)
				setStatus('idle')
				recognitionRef.current = null
			}
		},
		[stopRecognition, updateTranscript],
	)

	useEffect(() => {
		return () => {
			recognitionRef.current?.abort()
			recognitionRef.current = null
		}
	}, [])

	return {
		isSupported,
		status,
		transcript,
		error,
		startListening,
		continueListening,
		cancelListening,
	}
}

function joinTranscriptParts(left: string, right: string): string {
	const trimmedLeft = left.trim()
	const trimmedRight = right.trim()

	if (!trimmedLeft) {
		return trimmedRight
	}

	if (!trimmedRight) {
		return trimmedLeft
	}

	return `${trimmedLeft} ${trimmedRight}`
}
