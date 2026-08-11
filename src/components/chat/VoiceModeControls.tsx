import { Headphones, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEFAULT_LIVE_MODEL_ID } from '@/services/gemini/liveConstants'

interface VoiceModeControlsProps {
	hasApiKey: boolean
	isConversationActive: boolean
	isLiveActive: boolean
	isGenerating: boolean
	onStartConversation: () => void
	onStartLive: () => void
}

export function VoiceModeControls({
	hasApiKey,
	isConversationActive,
	isLiveActive,
	isGenerating,
	onStartConversation,
	onStartLive,
}: VoiceModeControlsProps) {
	const disabled =
		!hasApiKey || isGenerating || isConversationActive || isLiveActive

	function handleConversationClick(): void {
		const confirmed = window.confirm(
			'Start Conversation Mode?\n\nHands-free voice chat using your normal assistant — speech recognition, full chat with memory and tools, then spoken replies. The mic resumes after each reply.',
		)
		if (confirmed) {
			onStartConversation()
		}
	}

	function handleLiveClick(): void {
		const confirmed = window.confirm(
			`Start Live Mode?\n\nRealtime voice via ${DEFAULT_LIVE_MODEL_ID}. Lower latency, but uses the Live API while the session is open. Transcript is saved when you finish.`,
		)
		if (confirmed) {
			onStartLive()
		}
	}

	return (
		<div className="flex items-center gap-0.5">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0"
				disabled={disabled}
				onClick={handleConversationClick}
				title="Conversation Mode"
				aria-label="Conversation Mode"
			>
				<Phone className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0"
				disabled={disabled}
				onClick={handleLiveClick}
				title="Live Mode"
				aria-label="Live Mode"
			>
				<Headphones className="h-4 w-4" />
			</Button>
		</div>
	)
}
