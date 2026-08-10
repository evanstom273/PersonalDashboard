import { useCallback, useEffect, useRef, useState } from 'react'
import {
	ensureMicrophonePermission,
	getSpeechRecognitionConstructor,
	getSpeechRecognitionErrorMessage,
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
	startListening: (baseText?: string) => Promise<void>
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
	const statusRef = useRef<SpeechRecognitionStatus>('idle')
	const restartTimeoutRef = useRef<number | null>(null)

	statusRef.current = status

	const updateTranscript = useCallback(
		(next: string) => {
			setTranscript(next)
			onTranscriptChange?.(next)
		},
		[onTranscriptChange],
	)

	const clearRestartTimeout = useCallback(() => {
		if (restartTimeoutRef.current !== null) {
			window.clearTimeout(restartTimeoutRef.current)
			restartTimeoutRef.current = null
		}
	}, [])

	const stopRecognition = useCallback(() => {
		clearRestartTimeout()
		recognitionRef.current?.abort()
		recognitionRef.current = null
	}, [clearRestartTimeout])

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

	const bindRecognition = useCallback(
		(recognition: SpeechRecognition, restart: () => void) => {
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

				updateTranscript(joinTranscriptParts(committedRef.current, interim))
			}

			recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
				if (event.error === 'aborted') {
					return
				}

				if (event.error === 'no-speech' && statusRef.current === 'listening') {
					return
				}

				setError(
					event.message || getSpeechRecognitionErrorMessage(event.error),
				)
				setStatus('review')
				stopRecognition()
			}

			recognition.onend = () => {
				if (recognitionRef.current === recognition) {
					recognitionRef.current = null
				}

				if (statusRef.current !== 'listening') {
					return
				}

				clearRestartTimeout()
				restartTimeoutRef.current = window.setTimeout(() => {
					if (statusRef.current === 'listening') {
						restart()
					}
				}, 200)
			}
		},
		[clearRestartTimeout, stopRecognition, updateTranscript],
	)

	const startListening = useCallback(
		async (baseText = '') => {
			const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
			if (!SpeechRecognitionCtor) {
				setError('Speech recognition is not supported in this browser.')
				return
			}

			const permission = await ensureMicrophonePermission()
			if (!permission.ok) {
				setError(permission.message)
				setStatus('idle')
				return
			}

			stopRecognition()

			const trimmedBase = baseText.trim()
			baseTextRef.current = trimmedBase
			committedRef.current = trimmedBase
			updateTranscript(trimmedBase)
			setError(null)
			setStatus('listening')

			const launch = (): void => {
				if (statusRef.current !== 'listening') {
					return
				}

				const recognition = new SpeechRecognitionCtor()
				recognition.continuous = true
				recognition.interimResults = true
				recognition.lang = navigator.language || 'en-US'

				bindRecognition(recognition, launch)
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
			}

			launch()
		},
		[bindRecognition, stopRecognition, updateTranscript],
	)

	useEffect(() => {
		return () => {
			stopRecognition()
		}
	}, [stopRecognition])

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
