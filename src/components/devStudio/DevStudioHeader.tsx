import {
	GitBranch,
	GitPullRequest,
	Loader2,
	RefreshCw,
	Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DevStudioRepoSwitcher } from '@/components/devStudio/DevStudioRepoSwitcher'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { formatRateLimitLabel } from '@/utils/githubRateLimit'
import { cn } from '@/utils/cn'

export function DevStudioHeader() {
	const {
		isConfigured,
		branch,
		connectionStatus,
		connectionError,
		rateLimit,
		connectWorkspace,
		refreshWorkspace,
	} = useDevStudio()

	return (
		<header className="dev-studio-header shrink-0 border-b border-border/70 px-4 py-3 md:px-5">
			<div className="flex min-w-0 items-start justify-between gap-3">
				<div className="min-w-0">
					<DevStudioRepoSwitcher />
					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						{isConfigured ? (
							<>
								<span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
									<GitBranch className="h-3 w-3" />
									{branch}
								</span>
								<ConnectionBadge status={connectionStatus} />
								{rateLimit ? (
									<span title="GitHub REST API hourly limit">
										{formatRateLimitLabel(rateLimit)}
									</span>
								) : null}
							</>
						) : (
							<span>Connect GitHub in Settings to load a repo</span>
						)}
					</div>
					{connectionError ? (
						<p className="mt-2 text-xs text-destructive">{connectionError}</p>
					) : null}
				</div>

				<div className="flex shrink-0 items-center gap-1">
					{isConfigured ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => void refreshWorkspace()}
							disabled={connectionStatus === 'connecting'}
							aria-label="Refresh workspace"
						>
							{connectionStatus === 'connecting' ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void connectWorkspace()}
							disabled={!isConfigured}
						>
							Connect
						</Button>
					)}
					<Button asChild variant="ghost" size="icon" aria-label="Dev Studio settings">
						<Link to="/settings?tab=app">
							<Settings className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
		</header>
	)
}

function ConnectionBadge({
	status,
}: {
	status: ReturnType<typeof useDevStudio>['connectionStatus']
}) {
	const label =
		status === 'connected'
			? 'Connected'
			: status === 'connecting'
				? 'Connecting…'
				: status === 'error'
					? 'Error'
					: 'Not connected'

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
				status === 'connected' && 'bg-emerald-500/15 text-emerald-400',
				status === 'connecting' && 'bg-primary/15 text-primary',
				status === 'error' && 'bg-destructive/15 text-destructive',
				status === 'disconnected' && 'bg-secondary text-secondary-foreground',
			)}
		>
			{status === 'connected' ? <GitPullRequest className="h-3 w-3" /> : null}
			{label}
		</span>
	)
}
