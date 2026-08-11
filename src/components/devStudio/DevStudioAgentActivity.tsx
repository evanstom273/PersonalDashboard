import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
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
}: {
	streaming: DevStudioStreamingState
}) {
	const [elapsedMs, setElapsedMs] = useState(() => Date.now() - streaming.startedAt)

	useEffect(() => {
		const interval = window.setInterval(() => {
			setElapsedMs(Date.now() - streaming.startedAt)
		}, 250)
		return () => window.clearInterval(interval)
	}, [streaming.startedAt])

	const runningActivity = [...streaming.activities]
		.reverse()
		.find((activity) => activity.status === 'running')

	return (
		<div className="shrink-0 border-t border-border/60 bg-background/40 px-4 py-3 md:px-5">
			<div className="mx-auto w-full max-w-3xl space-y-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2 text-sm">
						<Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
						<span className="truncate font-medium">{phaseLabel(streaming.phase)}</span>
						{runningActivity ? (
							<span className="truncate text-muted-foreground">
								· {runningActivity.label}
							</span>
						) : null}
					</div>
					<span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
						{formatElapsed(elapsedMs)}
					</span>
				</div>

				{streaming.thoughts.trim() ? (
					<div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Reasoning
						</p>
						<p className="mt-1 max-h-28 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
							{streaming.thoughts.trim()}
						</p>
					</div>
				) : null}

				{streaming.activities.length > 0 ? (
					<ul className="space-y-1.5">
						{streaming.activities.map((activity) => (
							<li
								key={activity.id}
								className="flex items-start gap-2 text-xs text-muted-foreground"
							>
								<span className="mt-0.5 shrink-0">
									{activity.status === 'running' ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
									) : (
										<Check className="h-3.5 w-3.5 text-emerald-400" />
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
		</div>
	)
}
