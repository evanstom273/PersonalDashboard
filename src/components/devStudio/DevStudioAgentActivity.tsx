import { Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type {
	DevStudioAgentPhase,
	DevStudioStreamingState,
} from '@/types/devStudio'
import { cn } from '@/utils/cn'

function formatElapsed(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function phaseLabel(phase: DevStudioAgentPhase): string {
	switch (phase) {
		case 'tool':
			return 'Running tools'
		case 'writing':
			return 'Writing response'
		default:
			return 'Thinking'
	}
}

export function DevStudioAgentActivity({
	streaming,
	className,
}: {
	streaming: DevStudioStreamingState
	className?: string
}) {
	const [elapsedMs, setElapsedMs] = useState(() => Date.now() - streaming.startedAt)
	const activityListRef = useRef<HTMLUListElement>(null)

	useEffect(() => {
		const interval = window.setInterval(() => {
			setElapsedMs(Date.now() - streaming.startedAt)
		}, 250)
		return () => window.clearInterval(interval)
	}, [streaming.startedAt])

	useEffect(() => {
		const list = activityListRef.current
		if (!list) {
			return
		}
		list.scrollTop = list.scrollHeight
	}, [streaming.activities.length])

	const runningActivity = [...streaming.activities]
		.reverse()
		.find((activity) => activity.status === 'running')

	return (
		<div className={cn('space-y-2.5', className)}>
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
					<span className="truncate font-medium text-foreground">
						{phaseLabel(streaming.phase)}
					</span>
					{runningActivity ? (
						<span className="truncate">· {runningActivity.label}</span>
					) : null}
				</div>
				<span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
					{formatElapsed(elapsedMs)}
				</span>
			</div>

			{streaming.thoughts.trim() ? (
				<div className="rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2">
					<p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
						Reasoning
					</p>
					<p className="mt-1 max-h-20 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
						{streaming.thoughts.trim()}
					</p>
				</div>
			) : null}

			{streaming.activities.length > 0 ? (
				<ul
					ref={activityListRef}
					className="max-h-28 space-y-1 overflow-y-auto overscroll-contain"
				>
					{streaming.activities.map((activity) => (
						<li
							key={activity.id}
							className="flex items-start gap-2 text-xs text-muted-foreground"
						>
							<span className="mt-0.5 shrink-0">
								{activity.status === 'running' ? (
									<Loader2 className="h-3 w-3 animate-spin text-primary" />
								) : (
									<Check className="h-3 w-3 text-emerald-400" />
								)}
							</span>
							<span
								className={cn(
									activity.status === 'running' && 'text-foreground',
								)}
							>
								{activity.label}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}
