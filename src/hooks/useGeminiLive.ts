import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveSessionStatus, LiveTranscriptTurn } from '@/services/gemini/geminiLiveService'
import type { PendingDeleteConfirmation, StoredMessage, UserPreferences } from '@/storage/types'

interface UseGeminiLiveOptions {
	preferences: UserPreferences
	recentMessages: StoredMessage[]
	useWebSearch?: boolean
	onTranscriptTurns?: (turns: LiveTranscriptTurn[]) => void
	onPendingDelete?: (confirmation: PendingDeleteConfirmation) => void
}

type LiveSession = import('@/services/gemini/geminiLiveService').GeminiLiveSession

export function useGeminiLive({
	preferences,
	recentMessages,
	useWebSearch = false,
	onTranscriptTurns,
	onPendingDelete,
}: UseGeminiLiveOptions) {
	const [isActive, setIsActive] = useState(false)
	const [status, setStatus] = useState<LiveSessionStatus>('idle')
	const [inputTranscript, setInputTranscript] = useState('')
	const [outputTranscript, setOutputTranscript] = useState('')
	const [error, setError] = useState<string | null>(null)

	const sessionRef = useRef<LiveSession | null>(null)
	const transcriptTurnsRef = useRef<LiveTranscriptTurn[]>([])

	const endSession = useCallback(async () => {
		const session = sessionRef.current
		sessionRef.current = null
		if (session) {
			await session.stop()
		}
		const turns = transcriptTurnsRef.current
		transcriptTurnsRef.current = []
		setIsActive(false)
		setInputTranscript('')
		setOutputTranscript('')
		if (turns.length > 0) {
			onTranscriptTurns?.(turns)
		}
	}, [onTranscriptTurns])

	const startSession = useCallback(async () => {
		if (!preferences.geminiApiKey.trim()) {
			setError('Add your Gemini API key in Settings to use Live Mode.')
			return
		}

		setError(null)
		transcriptTurnsRef.current = []

		const { GeminiLiveSession } = await import('@/services/gemini/geminiLiveService')

		const session = new GeminiLiveSession({
			preferences,
			recentMessages,
			useWebSearch,
			onStatusChange: setStatus,
			onInputTranscript: (text, isFinal) => {
				setInputTranscript(text)
				if (isFinal) {
					setInputTranscript(text)
				}
			},
			onOutputTranscript: setOutputTranscript,
			onTranscriptTurn: (turn) => {
				transcriptTurnsRef.current.push(turn)
			},
			onPendingDelete,
			onError: (liveError) => {
				setError(liveError.message)
			},
		})

		sessionRef.current = session
		setIsActive(true)

		try {
			await session.start()
		} catch (startError) {
			sessionRef.current = null
			setIsActive(false)
			setError(
				startError instanceof Error
					? startError.message
					: 'Could not start Live Mode.',
			)
		}
	}, [onPendingDelete, preferences, recentMessages, useWebSearch])

	useEffect(() => {
		const handleVisibility = () => {
			if (document.visibilityState === 'hidden' && sessionRef.current) {
				void endSession()
			}
		}

		document.addEventListener('visibilitychange', handleVisibility)
		return () => {
			document.removeEventListener('visibilitychange', handleVisibility)
			void sessionRef.current?.stop()
			sessionRef.current = null
		}
	}, [endSession])

	return {
		isActive,
		status,
		inputTranscript,
		outputTranscript,
		error,
		startSession,
		endSession,
		clearError: () => setError(null),
	}
}
