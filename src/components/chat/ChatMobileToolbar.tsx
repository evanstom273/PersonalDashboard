import { VoiceModeControls } from '@/components/chat/VoiceModeControls'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import type { ConversationRecord } from '@/storage/types'

interface ChatMobileToolbarProps {
	hasApiKey: boolean
	isConversationActive: boolean
	isLiveActive: boolean
	isGenerating: boolean
	conversation: ConversationRecord | null
	onStartConversation: () => void
	onStartLive: () => void
	onClear: () => Promise<void>
	onImport: (conversation: ConversationRecord) => Promise<void>
}

export function ChatMobileToolbar({
	hasApiKey,
	isConversationActive,
	isLiveActive,
	isGenerating,
	conversation,
	onStartConversation,
	onStartLive,
	onClear,
	onImport,
}: ChatMobileToolbarProps) {
	return (
		<div className="flex shrink-0 items-center justify-end gap-1 border-b border-border/60 bg-card/40 px-4 py-1.5 md:hidden">
			<VoiceModeControls
				hasApiKey={hasApiKey}
				isConversationActive={isConversationActive}
				isLiveActive={isLiveActive}
				isGenerating={isGenerating}
				onStartConversation={onStartConversation}
				onStartLive={onStartLive}
			/>
			<ChatConversationActions
				conversation={conversation}
				isGenerating={isGenerating}
				onClear={onClear}
				onImport={onImport}
			/>
		</div>
	)
}
