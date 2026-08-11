import { Headphones, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { DEFAULT_LIVE_MODEL_ID } from '@/services/gemini/liveConstants'

type VoiceModeKind = 'conversation' | 'live'

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
	const [pendingMode, setPendingMode] = useState<VoiceModeKind | null>(null)

	const disabled =
		!hasApiKey || isGenerating || isConversationActive || isLiveActive

	function handleConfirm(): void {
		if (pendingMode === 'conversation') {
			onStartConversation()
		} else if (pendingMode === 'live') {
			onStartLive()
		}
		setPendingMode(null)
	}

	return (
		<>
			<div className="flex items-center gap-0.5">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0"
					disabled={disabled}
					onClick={() => setPendingMode('conversation')}
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
					onClick={() => setPendingMode('live')}
					title="Live Mode"
					aria-label="Live Mode"
				>
					<Headphones className="h-4 w-4" />
				</Button>
			</div>

			<Dialog
				open={pendingMode !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingMode(null)
					}
				}}
			>
				<DialogContent>
					{pendingMode === 'conversation' ? (
						<>
							<DialogHeader>
								<DialogTitle>Conversation Mode</DialogTitle>
								<DialogDescription>
									Hands-free voice chat using your normal assistant — speech
									recognition, full chat with memory, documents, projects, and
									tools, then spoken replies.
								</DialogDescription>
							</DialogHeader>
							<p className="text-sm text-muted-foreground">
								Speak naturally; the mic resumes after each reply. This reuses your
								usual chat models and is the recommended option for everyday voice
								use.
							</p>
						</>
					) : null}
					{pendingMode === 'live' ? (
						<>
							<DialogHeader>
								<DialogTitle>Live Mode</DialogTitle>
								<DialogDescription>
									Realtime back-and-forth voice via{' '}
									<span className="font-medium text-foreground">
										{DEFAULT_LIVE_MODEL_ID}
									</span>
									. Lower latency and natural interruption, but uses the Live API
									while the session is open.
								</DialogDescription>
							</DialogHeader>
							<p className="text-sm text-muted-foreground">
								Live sessions can use API quota more quickly than Conversation
								Mode. The session closes when you press End or leave the screen.
								Transcript is saved to this chat when you finish.
							</p>
						</>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPendingMode(null)}
						>
							Cancel
						</Button>
						<Button type="button" onClick={handleConfirm}>
							Start
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
