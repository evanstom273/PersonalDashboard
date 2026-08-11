import { PhoneOff, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceModeOverlayFrame } from '@/components/chat/VoiceModeOverlayFrame'
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
		<VoiceModeOverlayFrame label="Live Mode">
			<div className="surface-panel flex w-full max-w-md flex-col items-center gap-6 rounded-2xl p-8 text-foreground shadow-xl">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">Live Mode</p>
					<h2 className="text-2xl font-semibold">{aiName}</h2>
					<p
						className={cn(
							'mt-2 text-sm font-medium',
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
						'flex h-24 w-24 items-center justify-center rounded-full border-2',
						status === 'listening' && 'border-primary bg-primary/10',
						status === 'speaking' && 'border-emerald-500 bg-emerald-500/10',
						status === 'connecting' && 'border-amber-500 bg-amber-500/10',
					)}
				>
					<Radio
						className={cn(
							'h-10 w-10',
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

				<Button type="button" variant="destructive" onClick={onEnd}>
					<PhoneOff className="h-4 w-4" />
					End Live session
				</Button>
			</div>
		</VoiceModeOverlayFrame>
	)
}
