import {
	Check,
	CheckCircle2,
	ExternalLink,
	GitMerge,
	GitPullRequest,
	Globe,
	Loader2,
	RefreshCw,
	XCircle,
} from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
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
		recentlyMergedPullRequests,
		mergePullRequestByNumber,
		setMobileTab,
		setContextTab,
	} = useDevStudio()
	const [mergingNumber, setMergingNumber] = useState<number | null>(null)
	const [mergeError, setMergeError] = useState<string | null>(null)

	const mergedNumbers = useMemo(
		() => new Set(recentlyMergedPullRequests.map((pull) => pull.number)),
		[recentlyMergedPullRequests],
	)

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
				<PagesDeploymentCard />
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
						<div className="mt-3">
							<MergeActionButton
								pullNumber={lastPushResult.pullRequestNumber}
								isMerged={mergedNumbers.has(lastPushResult.pullRequestNumber)}
								isMerging={mergingNumber === lastPushResult.pullRequestNumber}
								isDisabled={
									mergingNumber !== null &&
									mergingNumber !== lastPushResult.pullRequestNumber
								}
								onMerge={handleMerge}
							/>
						</div>
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
							<PullRequestCard
								key={pull.id}
								owner={owner}
								repo={repo}
								number={pull.number}
								title={pull.title}
								headRef={pull.headRef}
								baseRef={pull.baseRef}
								mergeAction={
									<MergeActionButton
										pullNumber={pull.number}
										isMerged={mergedNumbers.has(pull.number)}
										isMerging={mergingNumber === pull.number}
										isDisabled={mergingNumber !== null && mergingNumber !== pull.number}
										onMerge={handleMerge}
									/>
								}
							/>
						))}
					</div>
				)}

				{recentlyMergedPullRequests.length > 0 ? (
					<div className="mt-6">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Recently merged
						</p>
						<div className="mt-3 space-y-2">
							{recentlyMergedPullRequests.map((pull) => (
								<PullRequestCard
									key={`merged-${pull.number}`}
									owner={owner}
									repo={repo}
									number={pull.number}
									title={pull.title}
									headRef={pull.headRef}
									baseRef={pull.baseRef}
									mergeAction={
										<MergeActionButton
											pullNumber={pull.number}
											isMerged
											isMerging={false}
											isDisabled
											onMerge={handleMerge}
										/>
									}
								/>
							))}
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}

function PagesDeploymentCard() {
	const { pagesDeployment, isPollingPagesStatus, refreshPagesStatus } =
		useDevStudio()

	if (!pagesDeployment || pagesDeployment.state === 'not_found') {
		return null
	}

	const { state, statusText, htmlUrl, logsUrl } = pagesDeployment

	return (
		<div className="rounded-xl border border-border/60 bg-background/30 px-3 py-3">
			<div className="flex items-center justify-between">
				<p className="text-xs font-medium text-muted-foreground uppercase">
					GitHub Pages
				</p>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={() => void refreshPagesStatus()}
					title="Refresh deployment status"
				>
					<RefreshCw
						className={cn('h-3.5 w-3.5', isPollingPagesStatus && 'animate-spin')}
					/>
				</Button>
			</div>

			<div className="mt-2 flex items-center gap-2">
				{state === 'building' && (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
						🟡 Building...
					</span>
				)}
				{state === 'deployed' && (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
						<CheckCircle2 className="h-3.5 w-3.5" />
						🟢 Live / Deployed
					</span>
				)}
				{state === 'failed' && (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
						<XCircle className="h-3.5 w-3.5" />
						🔴 Build Failed
					</span>
				)}
				{state === 'idle' && (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
						{statusText}
					</span>
				)}
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
				{htmlUrl ? (
					<a
						href={htmlUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
					>
						<Globe className="h-3.5 w-3.5" />
						View Live Site
					</a>
				) : null}
				{logsUrl ? (
					<a
						href={logsUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
					>
						<ExternalLink className="h-3.5 w-3.5" />
						View Build Run Logs
					</a>
				) : null}
			</div>
		</div>
	)
}

function PullRequestCard({
	owner,
	repo,
	number,
	title,
	headRef,
	baseRef,
	mergeAction,
}: {
	owner: string
	repo: string
	number: number
	title: string
	headRef: string
	baseRef: string
	mergeAction: ReactNode
}) {
	return (
		<article className="rounded-xl border border-border/60 bg-background/30 px-3 py-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium">{title}</p>
					<p className="mt-1 text-xs text-muted-foreground">
						#{number} · {headRef} → {baseRef}
					</p>
				</div>
				<a
					href={`https://github.com/${owner}/${repo}/pull/${number}`}
					target="_blank"
					rel="noreferrer"
					className="shrink-0 text-muted-foreground hover:text-primary"
					aria-label={`Open PR #${number} on GitHub`}
				>
					<ExternalLink className="h-4 w-4" />
				</a>
			</div>
			<div className="mt-3 flex flex-wrap gap-2">{mergeAction}</div>
		</article>
	)
}

function MergeActionButton({
	pullNumber,
	isMerged,
	isMerging,
	isDisabled,
	onMerge,
}: {
	pullNumber: number
	isMerged: boolean
	isMerging: boolean
	isDisabled: boolean
	onMerge: (pullNumber: number) => void
}) {
	if (isMerged) {
		return (
			<Button type="button" size="sm" variant="secondary" disabled>
				<Check className="h-4 w-4" />
				Merged
			</Button>
		)
	}

	return (
		<Button
			type="button"
			size="sm"
			onClick={() => void onMerge(pullNumber)}
			disabled={isDisabled || isMerging}
		>
			{isMerging ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<GitMerge className="h-4 w-4" />
			)}
			{isMerging ? 'Merging…' : 'Merge'}
		</Button>
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
