import { useCallback, useEffect, useRef, useState } from 'react'
import {
	ensureMicrophonePermission,
	getAndroidSpeechHelpMessage,
	getSpeechRecognitionConstructor,
	getSpeechRecognitionErrorMessage,
	getSpeechRecognitionProfile,
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
	hint: string | null
	startListening: (baseText?: string) => Promise<void>
	continueListening: () => void
	cancelListening: () => void
}

export function useSpeechRecognition(
	options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionResult {
	const { onTranscriptChange } = options
	const profile = getSpeechRecognitionProfile()
	const [isSupported] = useState(isSpeechRecognitionSupported)
	const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')
	const [transcript, setTranscript] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [hint, setHint] = useState<string | null>(null)

	const recognitionRef = useRef<SpeechRecognition | null>(null)
	const committedRef = useRef('')
	const baseTextRef = useRef('')
	const statusRef = useRef<SpeechRecognitionStatus>('idle')
	const restartTimeoutRef = useRef<number | null>(null)
	const silentRestartCountRef = useRef(0)
	const heardAudioRef = useRef(false)
	const heardResultRef = useRef(false)
	const sessionStartedRef = useRef(false)

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
		const active = recognitionRef.current
		recognitionRef.current = null
		if (active) {
			try {
				active.abort()
			} catch {
				// ignore abort errors during teardown
			}
		}
	}, [clearRestartTimeout])

	const cancelListening = useCallback(() => {
		stopRecognition()
		committedRef.current = ''
		baseTextRef.current = ''
		silentRestartCountRef.current = 0
		heardAudioRef.current = false
		heardResultRef.current = false
		sessionStartedRef.current = false
		setHint(null)
		setError(null)
		setStatus('idle')
		updateTranscript('')
	}, [stopRecognition, updateTranscript])

	const continueListening = useCallback(() => {
		stopRecognition()
		setStatus('review')
		setError(null)
		setHint(null)
	}, [stopRecognition])

	const bindRecognition = useCallback(
		(recognition: SpeechRecognition, restart: () => void) => {
			recognition.onstart = () => {
				sessionStartedRef.current = true
			}

			recognition.onaudiostart = () => {
				heardAudioRef.current = true
				setHint(null)
			}

			recognition.onresult = (event: SpeechRecognitionEvent) => {
				heardResultRef.current = true
				silentRestartCountRef.current = 0
				setHint(null)

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
					silentRestartCountRef.current += 1
					if (silentRestartCountRef.current >= profile.maxSilentRestarts) {
						setError(getSpeechRecognitionErrorMessage('no-speech'))
						if (profile.skipMicrophonePreflight) {
							setHint(getAndroidSpeechHelpMessage())
						}
						setStatus('review')
						stopRecognition()
					}
					return
				}

				setError(
					event.message || getSpeechRecognitionErrorMessage(event.error),
				)
				if (profile.skipMicrophonePreflight) {
					setHint(getAndroidSpeechHelpMessage())
				}
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

				if (
					!heardResultRef.current &&
					!heardAudioRef.current &&
					sessionStartedRef.current
				) {
					silentRestartCountRef.current += 1
				}

				if (silentRestartCountRef.current >= profile.maxSilentRestarts) {
					setError(
						heardAudioRef.current
							? getSpeechRecognitionErrorMessage('no-speech')
							: 'Speech recognition ended before audio was captured.',
					)
					if (profile.skipMicrophonePreflight) {
						setHint(getAndroidSpeechHelpMessage())
					}
					setStatus('review')
					return
				}

				clearRestartTimeout()
				restartTimeoutRef.current = window.setTimeout(() => {
					if (statusRef.current === 'listening') {
						sessionStartedRef.current = false
						restart()
					}
				}, profile.restartDelayMs)
			}
		},
		[
			clearRestartTimeout,
			profile.maxSilentRestarts,
			profile.restartDelayMs,
			profile.skipMicrophonePreflight,
			stopRecognition,
			updateTranscript,
		],
	)

	const startListening = useCallback(
		async (baseText = '') => {
			const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
			if (!SpeechRecognitionCtor) {
				setError('Speech recognition is not supported in this browser.')
				return
			}

			if (!profile.skipMicrophonePreflight) {
				const permission = await ensureMicrophonePermission()
				if (!permission.ok) {
					setError(permission.message)
					setStatus('idle')
					return
				}
			}

			stopRecognition()

			const trimmedBase = baseText.trim()
			baseTextRef.current = trimmedBase
			committedRef.current = trimmedBase
			silentRestartCountRef.current = 0
			heardAudioRef.current = false
			heardResultRef.current = false
			sessionStartedRef.current = false
			updateTranscript(trimmedBase)
			setError(null)
			setHint(
				profile.skipMicrophonePreflight
					? 'Speak now. Android may pause between phrases — keep talking or tap Continue when done.'
					: null,
			)
			setStatus('listening')

			const launch = (): void => {
				if (statusRef.current !== 'listening') {
					return
				}

				const recognition = new SpeechRecognitionCtor()
				recognition.continuous = profile.continuous
				recognition.interimResults = profile.interimResults
				recognition.lang = navigator.language || 'en-US'

				bindRecognition(recognition, launch)
				recognitionRef.current = recognition

				try {
					recognition.start()
				} catch (startError) {
					const message =
						startError instanceof Error
							? startError.message
							: 'Could not start speech recognition.'

					if (
						message.includes('InvalidStateError') ||
						message.toLowerCase().includes('already started')
					) {
						clearRestartTimeout()
						restartTimeoutRef.current = window.setTimeout(() => {
							if (statusRef.current === 'listening') {
								launch()
							}
						}, profile.restartDelayMs)
						return
					}

					setError(message)
					if (profile.skipMicrophonePreflight) {
						setHint(getAndroidSpeechHelpMessage())
					}
					setStatus('idle')
					recognitionRef.current = null
				}
			}

			launch()
		},
		[
			bindRecognition,
			clearRestartTimeout,
			profile.continuous,
			profile.interimResults,
			profile.restartDelayMs,
			profile.skipMicrophonePreflight,
			stopRecognition,
			updateTranscript,
		],
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
		hint,
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
