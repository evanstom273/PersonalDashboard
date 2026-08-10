import {
	createContext,
	useContext,
	type ReactNode,
} from 'react'
import { useConversations, usePreferences } from '@/hooks/useChatStorage'

type PreferencesContextValue = ReturnType<typeof usePreferences>
type ConversationsContextValue = ReturnType<typeof useConversations>

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const ConversationsContext = createContext<ConversationsContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
	const preferencesState = usePreferences()
	const conversationsState = useConversations()

	return (
		<PreferencesContext.Provider value={preferencesState}>
			<ConversationsContext.Provider value={conversationsState}>
				{children}
			</ConversationsContext.Provider>
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

export function useConversationsContext(): ConversationsContextValue {
	const context = useContext(ConversationsContext)
	if (!context) {
		throw new Error('useConversationsContext must be used within ChatProvider')
	}
	return context
}
