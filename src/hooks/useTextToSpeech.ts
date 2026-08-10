import { useCallback, useEffect, useRef, useState } from 'react'
import { synthesizeSpeechWithGemini } from '@/services/gemini/synthesizeSpeech'
import { normalizeTtsVoiceName } from '@/services/gemini/ttsVoices'
import type { TtsReadAloudMode, UserPreferences } from '@/storage/types'
import { prepareTextForSpeech } from '@/utils/speechText'

export type TtsPlaybackStatus = 'idle' | 'loading' | 'playing'

export interface SpeakAssistantMessageOptions {
	messageId: string
	text: string
}

interface UseTextToSpeechOptions {
	preferences: UserPreferences
}

interface CachedSpeech {
	dataUrl: string
}

export function shouldAutoPlayAssistantSpeech(
	mode: TtsReadAloudMode,
	inputMethod: 'typed' | 'speech',
): boolean {
	if (mode === 'always') {
		return true
	}

	if (mode === 'after_speech') {
		return inputMethod === 'speech'
	}

	return false
}

export function useTextToSpeech({ preferences }: UseTextToSpeechOptions) {
	const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
	const [status, setStatus] = useState<TtsPlaybackStatus>('idle')
	const [error, setError] = useState<string | null>(null)

	const audioRef = useRef<HTMLAudioElement | null>(null)
	const objectUrlRef = useRef<string | null>(null)
	const cacheRef = useRef<Map<string, CachedSpeech>>(new Map())
	const requestIdRef = useRef(0)

	const revokeObjectUrl = useCallback(() => {
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current)
			objectUrlRef.current = null
		}
	}, [])

	const stop = useCallback(() => {
		requestIdRef.current += 1
		const audio = audioRef.current
		if (audio) {
			audio.pause()
			audio.currentTime = 0
			audio.onended = null
			audio.onerror = null
		}
		revokeObjectUrl()
		setActiveMessageId(null)
		setStatus('idle')
	}, [revokeObjectUrl])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const buildCacheKey = useCallback(
		(messageId: string, speechText: string) => {
			const voiceName = normalizeTtsVoiceName(preferences.ttsVoiceName)
			return `${messageId}:${voiceName}:${speechText}`
		},
		[preferences.ttsVoiceName],
	)

	const playDataUrl = useCallback(
		async (messageId: string, dataUrl: string, requestId: number) => {
			stop()

			const blob = await fetch(dataUrl).then((response) => response.blob())
			if (requestId !== requestIdRef.current) {
				return
			}

			const objectUrl = URL.createObjectURL(blob)
			objectUrlRef.current = objectUrl

			const audio = audioRef.current ?? new Audio()
			audioRef.current = audio
			audio.src = objectUrl
			audio.onended = () => {
				if (requestId !== requestIdRef.current) {
					return
				}
				stop()
			}
			audio.onerror = () => {
				if (requestId !== requestIdRef.current) {
					return
				}
				setError('Could not play speech audio.')
				stop()
			}

			setActiveMessageId(messageId)
			setStatus('playing')

			try {
				await audio.play()
			} catch (playError) {
				if (requestId !== requestIdRef.current) {
					return
				}
				stop()
				const message =
					playError instanceof Error && playError.name === 'NotAllowedError'
						? 'Speech playback was blocked by the browser. Tap the speaker button to listen.'
						: 'Could not start speech playback.'
				setError(message)
			}
		},
		[stop],
	)

	const speakAssistantMessage = useCallback(
		async ({ messageId, text }: SpeakAssistantMessageOptions) => {
			const apiKey = preferences.geminiApiKey.trim()
			if (!apiKey) {
				setError('Add your Gemini API key in Settings to use text-to-speech.')
				return
			}

			const speechText = prepareTextForSpeech(text)
			if (!speechText) {
				setError('There is no readable text to speak in this message.')
				return
			}

			if (activeMessageId === messageId && status === 'playing') {
				stop()
				return
			}

			const requestId = requestIdRef.current + 1
			requestIdRef.current = requestId
			setError(null)
			setActiveMessageId(messageId)
			setStatus('loading')

			try {
				const cacheKey = buildCacheKey(messageId, speechText)
				let dataUrl = cacheRef.current.get(cacheKey)?.dataUrl

				if (!dataUrl) {
					const synthesized = await synthesizeSpeechWithGemini({
						apiKey,
						text: speechText,
						voiceName: normalizeTtsVoiceName(preferences.ttsVoiceName),
						preferences,
					})
					if (requestId !== requestIdRef.current) {
						return
					}
					dataUrl = synthesized.dataUrl
					cacheRef.current.set(cacheKey, { dataUrl })
				}

				await playDataUrl(messageId, dataUrl, requestId)
			} catch (speechError) {
				if (requestId !== requestIdRef.current) {
					return
				}
				stop()
				setError(
					speechError instanceof Error
						? speechError.message
						: 'Speech generation failed.',
				)
			}
		},
		[
			activeMessageId,
			buildCacheKey,
			playDataUrl,
			preferences,
			status,
			stop,
		],
	)

	const previewVoice = useCallback(
		async (voiceName: string) => {
			const apiKey = preferences.geminiApiKey.trim()
			if (!apiKey) {
				setError('Add your Gemini API key in Settings to preview voices.')
				return
			}

			const requestId = requestIdRef.current + 1
			requestIdRef.current = requestId
			setError(null)
			setActiveMessageId(null)
			setStatus('loading')

			try {
				const sampleText =
					'Hello! This is a short preview of how replies will sound when read aloud.'
				const synthesized = await synthesizeSpeechWithGemini({
					apiKey,
					text: sampleText,
					voiceName: normalizeTtsVoiceName(voiceName),
					preferences: {
						...preferences,
						ttsVoiceName: normalizeTtsVoiceName(voiceName),
					},
				})
				if (requestId !== requestIdRef.current) {
					return
				}

				await playDataUrl('voice-preview', synthesized.dataUrl, requestId)
			} catch (speechError) {
				if (requestId !== requestIdRef.current) {
					return
				}
				stop()
				setError(
					speechError instanceof Error
						? speechError.message
						: 'Voice preview failed.',
				)
			}
		},
		[playDataUrl, preferences, stop],
	)

	useEffect(() => {
		return () => {
			requestIdRef.current += 1
			const audio = audioRef.current
			if (audio) {
				audio.pause()
				audio.onended = null
				audio.onerror = null
			}
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current)
			}
			for (const entry of cacheRef.current.values()) {
				if (entry.dataUrl.startsWith('blob:')) {
					URL.revokeObjectURL(entry.dataUrl)
				}
			}
			cacheRef.current.clear()
		}
	}, [])

	return {
		activeMessageId,
		status,
		error,
		speakAssistantMessage,
		previewVoice,
		stop,
		clearError,
	}
}
