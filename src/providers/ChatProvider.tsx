import { useChatGeneration } from '@/hooks/useChatGeneration'
import { useMainConversation, usePreferences } from '@/hooks/useChatStorage'
import {
	createContext,
	useContext,
	type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

type PreferencesContextValue = ReturnType<typeof usePreferences>
type MainConversationContextValue = ReturnType<typeof useMainConversation>
type ChatGenerationContextValue = ReturnType<typeof useChatGeneration>

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const MainConversationContext =
	createContext<MainConversationContextValue | null>(null)
const ChatGenerationContext = createContext<ChatGenerationContextValue | null>(
	null,
)

export function ChatProvider({ children }: { children: ReactNode }) {
	const preferencesState = usePreferences()
	const conversationState = useMainConversation(
		preferencesState.preferences.defaultModelId,
	)
	const location = useLocation()
	const generationState = useChatGeneration({
		preferences: preferencesState.preferences,
		conversation: conversationState.conversation,
		appendMessages: conversationState.appendMessages,
		ensureConversation: conversationState.ensureConversation,
		saveConversation: conversationState.saveConversation,
		isChatRoute: location.pathname === '/',
	})

	return (
		<PreferencesContext.Provider value={preferencesState}>
			<MainConversationContext.Provider value={conversationState}>
				<ChatGenerationContext.Provider value={generationState}>
					{children}
				</ChatGenerationContext.Provider>
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
