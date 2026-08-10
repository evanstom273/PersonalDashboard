import { Outlet } from 'react-router-dom'
import { ChatSidebar } from '@/layout/ChatSidebar'
import {
	useConversationsContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'

export function AppShell() {
	const { preferences } = usePreferencesContext()
	const {
		conversations,
		activeConversationId,
		selectConversation,
		startConversation,
		deleteConversation,
	} = useConversationsContext()

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<ChatSidebar
				conversations={conversations}
				activeConversationId={activeConversationId}
				onNewChat={() => {
					void startConversation(preferences.defaultModelId)
				}}
				onSelectConversation={(id) => {
					void selectConversation(id)
				}}
				onDeleteConversation={(id) => {
					void deleteConversation(id)
				}}
			/>
			<main className="flex min-w-0 flex-1 flex-col">
				<Outlet />
			</main>
		</div>
	)
}
