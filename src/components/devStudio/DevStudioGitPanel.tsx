import { ExternalLink, GitPullRequest } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'

export function DevStudioGitPanel() {
	const { workspace, connectionStatus, repositorySlug, stagedChanges } =
		useDevStudio()

	if (connectionStatus === 'connecting') {
		return (
			<PanelPlaceholder
				title="Loading pull requests…"
				description="Fetching open PRs from GitHub."
			/>
		)
	}

	if (!workspace) {
		return (
			<PanelPlaceholder
				title="No git context"
				description="Connect a repository to review branches and pull requests."
			/>
		)
	}

	const [owner, repo] = repositorySlug.split('/')

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-3">
				<div>
					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Branch
					</p>
					<p className="mt-1 font-mono text-sm">{workspace.repo.branch}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" size="sm" variant="secondary" disabled>
						Create branch
					</Button>
					<Button type="button" size="sm" variant="outline" disabled>
						Open PR
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					{stagedChanges.length} staged change
					{stagedChanges.length === 1 ? '' : 's'} waiting for review
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Open pull requests
				</p>
				{workspace.pullRequests.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">No open pull requests.</p>
				) : (
					<div className="mt-3 space-y-2">
						{workspace.pullRequests.map((pull) => (
							<a
								key={pull.id}
								href={`https://github.com/${owner}/${repo}/pull/${pull.number}`}
								target="_blank"
								rel="noreferrer"
								className="block rounded-xl border border-border/60 bg-background/30 px-3 py-3 transition-colors hover:bg-accent"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{pull.title}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											#{pull.number} · {pull.headRef} → {pull.baseRef}
										</p>
									</div>
									<ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
								</div>
							</a>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function PanelPlaceholder({
	title,
	description,
}: {
	title: string
	description: string
}) {
	return (
		<div className="flex h-full items-center justify-center px-6 py-10 text-center">
			<div>
				<GitPullRequest className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	)
}
