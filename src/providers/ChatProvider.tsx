import {
	createContext,
	useContext,
	type ReactNode,
} from 'react'
import { useMainConversation, usePreferences } from '@/hooks/useChatStorage'

type PreferencesContextValue = ReturnType<typeof usePreferences>
type MainConversationContextValue = ReturnType<typeof useMainConversation>

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const MainConversationContext =
	createContext<MainConversationContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
	const preferencesState = usePreferences()
	const conversationState = useMainConversation(
		preferencesState.preferences.defaultModelId,
	)

	return (
		<PreferencesContext.Provider value={preferencesState}>
			<MainConversationContext.Provider value={conversationState}>
				{children}
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
