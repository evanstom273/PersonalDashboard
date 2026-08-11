import type { ReactNode } from 'react'

interface VoiceSessionOverlayProps {
	label: string
	onDismiss: () => void
	children: ReactNode
}

export function VoiceSessionOverlay({
	label,
	onDismiss,
	children,
}: VoiceSessionOverlayProps) {
	return (
		<div className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 p-4 pb-6 sm:items-center">
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				aria-label={`Close ${label}`}
				onClick={onDismiss}
			/>
			<div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
				{children}
			</div>
		</div>
	)
}
