import { usePreferencesContext } from '@/providers/ChatProvider'
import { DevStudioAgentActivity } from '@/components/devStudio/DevStudioAgentActivity'
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
				streamingAssistant={
					streamingAssistant
						? {
								id: streamingAssistant.id,
								content: streamingAssistant.content,
							}
						: null
				}
				isGenerating={isComposerSending}
				aiName={aiName}
				onConfirmDelete={() => {}}
				onCancelDelete={() => {}}
			/>
			{streamingAssistant && isComposerSending ? (
				<DevStudioAgentActivity streaming={streamingAssistant} />
			) : null}
			<DevStudioComposer />
		</section>
	)
}
