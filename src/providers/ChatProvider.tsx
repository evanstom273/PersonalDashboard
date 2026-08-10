import {
	createContext,
	useContext,
	useState,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from 'react'
import { useMainConversation, usePreferences } from '@/hooks/useChatStorage'

type PreferencesContextValue = ReturnType<typeof usePreferences>
type MainConversationContextValue = ReturnType<typeof useMainConversation>

interface ChatUiContextValue {
	isChatGenerating: boolean
	setIsChatGenerating: Dispatch<SetStateAction<boolean>>
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const MainConversationContext =
	createContext<MainConversationContextValue | null>(null)
const ChatUiContext = createContext<ChatUiContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
	const preferencesState = usePreferences()
	const conversationState = useMainConversation(
		preferencesState.preferences.defaultModelId,
	)
	const [isChatGenerating, setIsChatGenerating] = useState(false)

	return (
		<PreferencesContext.Provider value={preferencesState}>
			<MainConversationContext.Provider value={conversationState}>
				<ChatUiContext.Provider value={{ isChatGenerating, setIsChatGenerating }}>
					{children}
				</ChatUiContext.Provider>
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

export function useChatUiContext(): ChatUiContextValue {
	const context = useContext(ChatUiContext)
	if (!context) {
		throw new Error('useChatUiContext must be used within ChatProvider')
	}
	return context
}
