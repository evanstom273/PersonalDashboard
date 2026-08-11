import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface VoiceModeOverlayFrameProps {
	children: ReactNode
	label: string
}

export function VoiceModeOverlayFrame({
	children,
	label,
}: VoiceModeOverlayFrameProps) {
	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4"
			role="dialog"
			aria-modal="true"
			aria-label={label}
		>
			{children}
		</div>,
		document.body,
	)
}
