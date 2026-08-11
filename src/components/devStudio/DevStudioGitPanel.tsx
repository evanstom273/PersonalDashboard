import { ExternalLink, GitMerge, GitPullRequest, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { cn } from '@/utils/cn'

export function DevStudioGitPanel({ className }: { className?: string }) {
	const {
		workspace,
		connectionStatus,
		repositorySlug,
		stagedChanges,
		lastPushResult,
		mergePullRequestByNumber,
		setMobileTab,
		setContextTab,
	} = useDevStudio()
	const [mergingNumber, setMergingNumber] = useState<number | null>(null)
	const [mergeError, setMergeError] = useState<string | null>(null)

	const handleMerge = useCallback(
		async (pullNumber: number) => {
			setMergeError(null)
			setMergingNumber(pullNumber)
			try {
				await mergePullRequestByNumber(pullNumber, 'squash')
			} catch (caught) {
				setMergeError(
					caught instanceof Error ? caught.message : 'Could not merge pull request.',
				)
			} finally {
				setMergingNumber(null)
			}
		},
		[mergePullRequestByNumber],
	)

	if (connectionStatus === 'connecting') {
		return (
			<PanelPlaceholder
				className={className}
				title="Loading pull requests…"
				description="Fetching open PRs from GitHub."
			/>
		)
	}

	if (!workspace) {
		return (
			<PanelPlaceholder
				className={className}
				title="No git context"
				description="Connect a repository to review branches and pull requests."
			/>
		)
	}

	const [owner, repo] = repositorySlug.split('/')

	return (
		<div className={cn('flex h-full min-h-0 flex-col', className)}>
			<div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-3">
				<div>
					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Branch
					</p>
					<p className="mt-1 font-mono text-sm">{workspace.repo.branch}</p>
				</div>
				{lastPushResult ? (
					<div className="rounded-xl border border-border/60 bg-background/30 px-3 py-3">
						<p className="text-xs font-medium text-muted-foreground uppercase">
							Last push
						</p>
						<p className="mt-1 font-mono text-xs">{lastPushResult.branchName}</p>
						<a
							href={lastPushResult.pullRequestUrl}
							target="_blank"
							rel="noreferrer"
							className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
						>
							PR #{lastPushResult.pullRequestNumber}
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
					</div>
				) : null}
				<p className="text-xs text-muted-foreground">
					{stagedChanges.length} staged change
					{stagedChanges.length === 1 ? '' : 's'} waiting for review
					{stagedChanges.length > 0 ? (
						<>
							{' · '}
							<button
								type="button"
								className="text-primary hover:underline"
								onClick={() => {
									setContextTab('changes')
									setMobileTab('diff')
								}}
							>
								Review
							</button>
						</>
					) : null}
				</p>
				{mergeError ? (
					<p className="text-xs text-destructive">{mergeError}</p>
				) : null}
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
							<article
								key={pull.id}
								className="rounded-xl border border-border/60 bg-background/30 px-3 py-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{pull.title}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											#{pull.number} · {pull.headRef} → {pull.baseRef}
										</p>
									</div>
									<a
										href={`https://github.com/${owner}/${repo}/pull/${pull.number}`}
										target="_blank"
										rel="noreferrer"
										className="shrink-0 text-muted-foreground hover:text-primary"
										aria-label={`Open PR #${pull.number} on GitHub`}
									>
										<ExternalLink className="h-4 w-4" />
									</a>
								</div>
								<div className="mt-3 flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => void handleMerge(pull.number)}
										disabled={mergingNumber !== null}
									>
										{mergingNumber === pull.number ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<GitMerge className="h-4 w-4" />
										)}
										Merge
									</Button>
								</div>
							</article>
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
	className,
}: {
	title: string
	description: string
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex h-full items-center justify-center px-6 py-10 text-center',
				className,
			)}
		>
			<div>
				<GitPullRequest className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	)
}
