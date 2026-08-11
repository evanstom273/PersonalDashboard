import { PhoneOff, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceSessionOverlay } from '@/components/chat/VoiceSessionOverlay'
import type { LiveSessionStatus } from '@/services/gemini/geminiLiveService'
import { cn } from '@/utils/cn'

interface LiveModeOverlayProps {
	aiName: string
	status: LiveSessionStatus
	inputTranscript: string
	outputTranscript: string
	error: string | null
	onEnd: () => void
}

const STATUS_LABELS: Record<LiveSessionStatus, string> = {
	idle: 'Idle',
	connecting: 'Connecting',
	listening: 'Listening',
	speaking: 'Speaking',
	thinking: 'Thinking',
	error: 'Error',
}

export function LiveModeOverlay({
	aiName,
	status,
	inputTranscript,
	outputTranscript,
	error,
	onEnd,
}: LiveModeOverlayProps) {
	return (
		<VoiceSessionOverlay label="Live Mode" onDismiss={onEnd}>
			<div className="flex flex-col items-center gap-4">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">{aiName}</p>
					<p
						className={cn(
							'mt-1 text-sm font-medium',
							status === 'listening' && 'text-primary',
							status === 'speaking' && 'text-emerald-500',
							status === 'connecting' && 'text-amber-500',
							status === 'error' && 'text-destructive',
						)}
					>
						{STATUS_LABELS[status]}
					</p>
				</div>

				<div
					className={cn(
						'flex h-16 w-16 items-center justify-center rounded-full border-2',
						status === 'listening' && 'border-primary bg-primary/10',
						status === 'speaking' && 'border-emerald-500 bg-emerald-500/10',
						status === 'connecting' && 'border-amber-500 bg-amber-500/10',
					)}
				>
					<Radio
						className={cn(
							'h-8 w-8',
							(status === 'listening' || status === 'connecting') &&
								'text-primary animate-pulse',
							status === 'speaking' && 'text-emerald-500',
						)}
					/>
				</div>

				<div className="w-full space-y-2 text-sm">
					{inputTranscript ? (
						<p className="text-muted-foreground">
							<span className="font-medium text-foreground">You: </span>
							{inputTranscript}
						</p>
					) : null}
					{outputTranscript ? (
						<p className="text-muted-foreground">
							<span className="font-medium text-foreground">{aiName}: </span>
							{outputTranscript}
						</p>
					) : null}
					{!inputTranscript && !outputTranscript ? (
						<p className="text-center text-muted-foreground">
							Realtime voice with Gemini Live. Interrupt anytime by speaking.
						</p>
					) : null}
				</div>

				{error ? (
					<p className="text-center text-sm text-destructive">{error}</p>
				) : null}

				<Button type="button" variant="destructive" size="sm" onClick={onEnd}>
					<PhoneOff className="h-4 w-4" />
					End Live session
				</Button>
			</div>
		</VoiceSessionOverlay>
	)
}
