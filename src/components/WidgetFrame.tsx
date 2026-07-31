import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface WidgetFrameProps {
	title: string
	description?: string
	actions?: ReactNode
	children: ReactNode
	className?: string
	contentClassName?: string
}

export function WidgetFrame({
	title,
	description,
	actions,
	children,
	className,
	contentClassName,
}: WidgetFrameProps) {
	return (
		<div
			className={cn(
				'flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm',
				className,
			)}
		>
			<div className="widget-drag-handle flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
				<div className="min-w-0">
					<h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
					{description ? (
						<p className="truncate text-xs text-muted-foreground">{description}</p>
					) : null}
				</div>
				{actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
			</div>
			<div className={cn('flex-1 overflow-auto p-4', contentClassName)}>{children}</div>
		</div>
	)
}
