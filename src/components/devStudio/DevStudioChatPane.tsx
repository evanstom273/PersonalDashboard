import { usePreferencesContext } from '@/providers/ChatProvider'
import { DevStudioComposer } from '@/components/devStudio/DevStudioComposer'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { cn } from '@/utils/cn'

export function DevStudioChatPane({ className }: { className?: string }) {
	const { messages, streamingAssistant, isComposerSending } = useDevStudio()
	const { preferences } = usePreferencesContext()
	const aiName = getConfiguredAiName(preferences)

	return (
		<section className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
			<ChatMessages
				messages={messages}
				streamingAssistant={streamingAssistant}
				isGenerating={isComposerSending}
				aiName={aiName}
				onConfirmDelete={() => {}}
				onCancelDelete={() => {}}
			/>
			<DevStudioComposer />
		</section>
	)
}
