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
				'flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[inset_0_1px_0_0] shadow-primary/5',
				className,
			)}
		>
			<div className="widget-drag-handle flex items-center justify-between gap-3 border-b border-border bg-surface/50 px-3.5 py-2.5">
				<div className="min-w-0 pl-0.5">
					<h3 className="truncate text-sm font-medium tracking-tight text-foreground">{title}</h3>
					{description ? (
						<p className="truncate text-[11px] text-muted-foreground">{description}</p>
					) : null}
				</div>
				{actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
			</div>
			<div className={cn('min-h-0 flex-1 overflow-auto p-3.5', contentClassName)}>{children}</div>
		</div>
	)
}
