import { Headphones, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceModeControlsProps {
	conversationEnabled: boolean
	liveEnabled: boolean
	hasApiKey: boolean
	isConversationActive: boolean
	isLiveActive: boolean
	isGenerating: boolean
	onStartConversation: () => void
	onStartLive: () => void
}

export function VoiceModeControls({
	conversationEnabled,
	liveEnabled,
	hasApiKey,
	isConversationActive,
	isLiveActive,
	isGenerating,
	onStartConversation,
	onStartLive,
}: VoiceModeControlsProps) {
	const disabled = !hasApiKey || isGenerating || isConversationActive || isLiveActive

	return (
		<div className="flex items-center gap-1">
			{conversationEnabled ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-9 w-9 shrink-0"
					disabled={disabled}
					onClick={onStartConversation}
					title="Conversation Mode"
					aria-label="Start Conversation Mode"
				>
					<Phone className="h-4 w-4" />
				</Button>
			) : null}
			{liveEnabled ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-9 w-9 shrink-0"
					disabled={disabled}
					onClick={onStartLive}
					title="Live Mode"
					aria-label="Start Live Mode"
				>
					<Headphones className="h-4 w-4" />
				</Button>
			) : null}
		</div>
	)
}
