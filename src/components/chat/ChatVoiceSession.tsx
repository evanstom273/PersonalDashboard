import { ConversationModeOverlay } from '@/components/chat/ConversationModeOverlay'
import { LiveModeOverlay } from '@/components/chat/LiveModeOverlay'
import { VoiceModeControls } from '@/components/chat/VoiceModeControls'
import { useConversationMode } from '@/hooks/useConversationMode'
import { useGeminiLive } from '@/hooks/useGeminiLive'
import { useChatHeaderSlot, useVoiceSessionContext } from '@/providers/ChatProvider'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { ChatSubmitPayload } from '@/types/chat'
import { useCallback, useEffect, useRef } from 'react'

interface ChatVoiceSessionProps {
	preferences: UserPreferences
	conversationMessages: StoredMessage[]
	webSearchEnabled: boolean
	isGenerating: boolean
	hasApiKey: boolean
	aiName: string
	speechStatus: 'idle' | 'loading' | 'playing'
	onSubmit: (payload: ChatSubmitPayload) => Promise<void>
	onStopSpeech: () => void
	onSpeakAssistantMessage: (options: {
		messageId: string
		text: string
		suppressErrorState?: boolean
		onEnded?: () => void
		onError?: () => void
	}) => void
	onAppendMessages: (messages: StoredMessage[]) => Promise<unknown>
}

export function ChatVoiceSession({
	preferences,
	conversationMessages,
	webSearchEnabled,
	isGenerating,
	hasApiKey,
	aiName,
	speechStatus,
	onSubmit,
	onStopSpeech,
	onSpeakAssistantMessage,
	onAppendMessages,
}: ChatVoiceSessionProps) {
	const { setSlot } = useChatHeaderSlot()
	const { conversationModeActiveRef } = useVoiceSessionContext()

	const awaitingConversationReplyRef = useRef(false)
	const lastSpokenMessageIdRef = useRef<string | null>(null)

	const handleConversationSubmit = useCallback(
		async (payload: Parameters<typeof onSubmit>[0]) => {
			awaitingConversationReplyRef.current = true
			await onSubmit(payload)
		},
		[onSubmit],
	)

	const conversationMode = useConversationMode({
		geminiApiKey: preferences.geminiApiKey,
		transcriptionModelId: preferences.defaultModelId,
		onSubmit: handleConversationSubmit,
		onStopSpeaking: onStopSpeech,
	})

	const persistLiveTranscript = useCallback(
		async (turns: Array<{ role: 'user' | 'assistant'; content: string }>) => {
			const messages = turns
				.filter((turn) => turn.content.trim().length > 0)
				.map((turn) => ({
					id: crypto.randomUUID(),
					role: turn.role,
					content: turn.content.trim(),
					createdAt: Date.now(),
				}))
			if (messages.length > 0) {
				await onAppendMessages(messages as StoredMessage[])
			}
		},
		[onAppendMessages],
	)

	const liveMode = useGeminiLive({
		preferences,
		recentMessages: conversationMessages,
		useWebSearch: webSearchEnabled,
		onTranscriptTurns: persistLiveTranscript,
		onPendingDelete: async (confirmation) => {
			await onAppendMessages([
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: `Please confirm deletion of "${confirmation.documentTitle}" in the chat.`,
					pendingDeleteConfirmation: confirmation,
					createdAt: Date.now(),
				},
			])
		},
	})

	useEffect(() => {
		setSlot(
			<VoiceModeControls
				hasApiKey={hasApiKey}
				isConversationActive={conversationMode.isActive}
				isLiveActive={liveMode.isActive}
				isGenerating={isGenerating}
				onStartConversation={() => void conversationMode.startConversation()}
				onStartLive={() => void liveMode.startSession()}
			/>,
		)
		return () => setSlot(null)
	}, [
		setSlot,
		hasApiKey,
		conversationMode.isActive,
		liveMode.isActive,
		isGenerating,
		conversationMode.startConversation,
		liveMode.startSession,
	])

	useEffect(() => {
		conversationModeActiveRef.current = conversationMode.isActive
	}, [conversationMode.isActive, conversationModeActiveRef])

	useEffect(() => {
		if (!conversationMode.isActive || isGenerating) {
			return
		}
		if (!awaitingConversationReplyRef.current) {
			return
		}

		const lastMessage = conversationMessages[conversationMessages.length - 1]
		if (!lastMessage || lastMessage.role !== 'assistant') {
			return
		}
		if (lastSpokenMessageIdRef.current === lastMessage.id) {
			return
		}

		awaitingConversationReplyRef.current = false
		lastSpokenMessageIdRef.current = lastMessage.id
		conversationMode.setStatus('speaking')

		onSpeakAssistantMessage({
			messageId: lastMessage.id,
			text: lastMessage.content,
			suppressErrorState: true,
			onEnded: () => {
				void conversationMode.resumeListening()
			},
			onError: () => {
				void conversationMode.resumeListening()
			},
		})
	}, [
		conversationMessages,
		conversationMode.isActive,
		conversationMode.setStatus,
		conversationMode.resumeListening,
		isGenerating,
		onSpeakAssistantMessage,
	])

	return (
		<>
			{conversationMode.isActive ? (
				<ConversationModeOverlay
					aiName={aiName}
					status={conversationMode.status}
					liveTranscript={conversationMode.liveTranscript}
					isMuted={conversationMode.isMuted}
					error={conversationMode.error}
					onEnd={() => void conversationMode.endConversation()}
					onToggleMute={conversationMode.toggleMute}
					onInterrupt={conversationMode.interruptSpeaking}
					isSpeaking={speechStatus === 'playing'}
				/>
			) : null}

			{liveMode.isActive ? (
				<LiveModeOverlay
					aiName={aiName}
					status={liveMode.status}
					inputTranscript={liveMode.inputTranscript}
					outputTranscript={liveMode.outputTranscript}
					error={liveMode.error}
					onEnd={() => void liveMode.endSession()}
				/>
			) : null}
		</>
	)
}
