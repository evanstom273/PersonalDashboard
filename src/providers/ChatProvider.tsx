import { useChatGeneration } from '@/hooks/useChatGeneration'
import { useMainConversation, usePreferences } from '@/hooks/useChatStorage'
import {
	shouldAutoPlayAssistantSpeech,
	useTextToSpeech,
} from '@/hooks/useTextToSpeech'
import {
	createContext,
	useCallback,
	useContext,
	type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

type PreferencesContextValue = ReturnType<typeof usePreferences>
type MainConversationContextValue = ReturnType<typeof useMainConversation>
type ChatGenerationContextValue = ReturnType<typeof useChatGeneration>
type TextToSpeechContextValue = ReturnType<typeof useTextToSpeech>

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const MainConversationContext =
	createContext<MainConversationContextValue | null>(null)
const ChatGenerationContext = createContext<ChatGenerationContextValue | null>(
	null,
)
const TextToSpeechContext = createContext<TextToSpeechContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
	const preferencesState = usePreferences()
	const conversationState = useMainConversation(
		preferencesState.preferences.defaultModelId,
	)
	const location = useLocation()
	const textToSpeechState = useTextToSpeech({
		preferences: preferencesState.preferences,
	})

	const handleAssistantReply = useCallback<
		NonNullable<Parameters<typeof useChatGeneration>[0]['onAssistantReply']>
	>(
		({ message, inputMethod }) => {
			if (
				!shouldAutoPlayAssistantSpeech(
					preferencesState.preferences.ttsReadAloudMode,
					inputMethod,
				)
			) {
				return
			}

			void textToSpeechState.speakAssistantMessage({
				messageId: message.id,
				text: message.content,
			})
		},
		[
			preferencesState.preferences.ttsReadAloudMode,
			textToSpeechState.speakAssistantMessage,
		],
	)

	const generationState = useChatGeneration({
		preferences: preferencesState.preferences,
		conversation: conversationState.conversation,
		appendMessages: conversationState.appendMessages,
		truncateMessagesFrom: conversationState.truncateMessagesFrom,
		ensureConversation: conversationState.ensureConversation,
		saveConversation: conversationState.saveConversation,
		isChatRoute: location.pathname === '/',
		onAssistantReply: handleAssistantReply,
	})

	return (
		<PreferencesContext.Provider value={preferencesState}>
			<MainConversationContext.Provider value={conversationState}>
				<TextToSpeechContext.Provider value={textToSpeechState}>
					<ChatGenerationContext.Provider value={generationState}>
						{children}
					</ChatGenerationContext.Provider>
				</TextToSpeechContext.Provider>
			</MainConversationContext.Provider>
		</PreferencesContext.Provider>
	)
}

export function usePreferencesContext(): PreferencesContextValue {
	const context = useContext(PreferencesContext)
	if (!context) {
		throw new Error('usePreferencesContext must be used within ChatProvider')
	}
	return context
}

export function useMainConversationContext(): MainConversationContextValue {
	const context = useContext(MainConversationContext)
	if (!context) {
		throw new Error(
			'useMainConversationContext must be used within ChatProvider',
		)
	}
	return context
}

export function useChatGenerationContext(): ChatGenerationContextValue {
	const context = useContext(ChatGenerationContext)
	if (!context) {
		throw new Error(
			'useChatGenerationContext must be used within ChatProvider',
		)
	}
	return context
}

export function useTextToSpeechContext(): TextToSpeechContextValue {
	const context = useContext(TextToSpeechContext)
	if (!context) {
		throw new Error(
			'useTextToSpeechContext must be used within ChatProvider',
		)
	}
	return context
}

/** @deprecated Use useChatGenerationContext().isGenerating */
export function useChatUiContext(): {
	isChatGenerating: boolean
	setIsChatGenerating: never
} {
	const { isGenerating } = useChatGenerationContext()
	return {
		isChatGenerating: isGenerating,
		setIsChatGenerating: (() => {
			throw new Error('setIsChatGenerating is no longer supported')
		}) as never,
	}
}
