import { PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMaxIterationsForModel, resolveDevStudioModelId } from '@/services/devStudio/devStudioModels'
import { usePreferencesContext } from '@/providers/ChatProvider'
import type { DevStudioAgentTaskStatus } from '@/types/devStudio'
import { cn } from '@/utils/cn'

export function DevStudioTaskStatusBadge({
	status,
	className,
}: {
	status: DevStudioAgentTaskStatus
	className?: string
}) {
	if (status === 'idle') {
		return null
	}

	const toneClass =
		status === 'completed'
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
			: status === 'running'
				? 'border-primary/30 bg-primary/10 text-primary'
				: status === 'error'
					? 'border-destructive/30 bg-destructive/10 text-destructive'
					: 'border-amber-500/30 bg-amber-500/10 text-amber-400'

	const label =
		status === 'completed'
			? 'Ready for review'
			: status === 'running'
				? 'Agent drafting…'
				: status === 'limit_reached'
					? 'Incomplete — iteration limit'
					: status === 'stopped'
						? 'Incomplete — stopped'
						: 'Agent error'

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
				toneClass,
				className,
			)}
		>
			{label}
		</span>
	)
}

export function DevStudioResumeBanner({
	status,
	onResume,
	disabled,
}: {
	status: DevStudioAgentTaskStatus
	onResume: () => void
	disabled?: boolean
}) {
	const { preferences } = usePreferencesContext()

	if (status !== 'limit_reached' && status !== 'stopped') {
		return null
	}

	const modelId = resolveDevStudioModelId(preferences.devStudioModelId)
	const maxIterations = getMaxIterationsForModel(modelId)

	return (
		<div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
			<p>
				The agent was interrupted before finishing. Resume to continue with up to{' '}
				<span className="font-mono">{maxIterations}</span> more tool steps.
			</p>
			<Button
				type="button"
				size="sm"
				variant="secondary"
				disabled={disabled}
				onClick={onResume}
			>
				<PlayCircle className="h-4 w-4" />
				Resume task
			</Button>
		</div>
	)
}
