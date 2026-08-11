import { Mic, MicOff, PhoneOff, Radio, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceModeOverlayFrame } from '@/components/chat/VoiceModeOverlayFrame'
import type { ConversationModeStatus } from '@/hooks/useConversationMode'
import { cn } from '@/utils/cn'

interface ConversationModeOverlayProps {
	aiName: string
	status: ConversationModeStatus
	liveTranscript: string
	isMuted: boolean
	error: string | null
	onEnd: () => void
	onToggleMute: () => void
	onInterrupt: () => void
	isSpeaking: boolean
}

const STATUS_LABELS: Record<ConversationModeStatus, string> = {
	idle: 'Idle',
	listening: 'Listening',
	transcribing: 'Transcribing',
	thinking: 'Thinking',
	speaking: 'Speaking',
}

export function ConversationModeOverlay({
	aiName,
	status,
	liveTranscript,
	isMuted,
	error,
	onEnd,
	onToggleMute,
	onInterrupt,
	isSpeaking,
}: ConversationModeOverlayProps) {
	return (
		<VoiceModeOverlayFrame label="Conversation Mode">
			<div className="surface-panel flex w-full max-w-md flex-col items-center gap-6 rounded-2xl p-8 text-foreground shadow-xl">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">Conversation Mode</p>
					<h2 className="text-2xl font-semibold">{aiName}</h2>
					<p
						className={cn(
							'mt-2 text-sm font-medium',
							status === 'listening' && 'text-primary',
							status === 'thinking' && 'text-amber-500',
							status === 'speaking' && 'text-emerald-500',
						)}
					>
						{isMuted ? 'Muted' : STATUS_LABELS[status]}
					</p>
				</div>

				<div
					className={cn(
						'flex h-24 w-24 items-center justify-center rounded-full border-2',
						status === 'listening' && !isMuted && 'border-primary bg-primary/10',
						status === 'speaking' && 'border-emerald-500 bg-emerald-500/10',
						status === 'thinking' && 'border-amber-500 bg-amber-500/10',
						isMuted && 'border-muted bg-muted/20',
					)}
				>
					<Radio
						className={cn(
							'h-10 w-10',
							status === 'listening' && !isMuted && 'text-primary animate-pulse',
							status === 'speaking' && 'text-emerald-500',
							status === 'thinking' && 'text-amber-500',
						)}
					/>
				</div>

				{liveTranscript ? (
					<p className="max-h-24 w-full overflow-y-auto text-center text-sm text-muted-foreground">
						{liveTranscript}
					</p>
				) : (
					<p className="text-center text-sm text-muted-foreground">
						Speak naturally. The mic resumes automatically after each reply.
					</p>
				)}

				{error ? (
					<p className="text-center text-sm text-destructive">{error}</p>
				) : null}

				<div className="flex flex-wrap items-center justify-center gap-3">
					<Button type="button" variant="outline" onClick={onToggleMute}>
						{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
						{isMuted ? 'Unmute' : 'Mute'}
					</Button>
					{isSpeaking ? (
						<Button type="button" variant="outline" onClick={onInterrupt}>
							<Square className="h-4 w-4" />
							Interrupt
						</Button>
					) : null}
					<Button type="button" variant="destructive" onClick={onEnd}>
						<PhoneOff className="h-4 w-4" />
						End conversation
					</Button>
				</div>
			</div>
		</VoiceModeOverlayFrame>
	)
}
