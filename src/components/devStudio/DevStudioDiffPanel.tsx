import { ExternalLink, GitCommitHorizontal, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { generateDevStudioPushMetadata } from '@/utils/devStudioPushMetadata'
import { cn } from '@/utils/cn'

export function DevStudioDiffPanel({ className }: { className?: string }) {
	const {
		stagedChanges,
		discardStagedChange,
		discardAllStagedChanges,
		pushStagedChanges,
		isPushing,
		lastPushResult,
	} = useDevStudio()
	const [commitMessage, setCommitMessage] = useState('')
	const [pullRequestTitle, setPullRequestTitle] = useState('')
	const [pushError, setPushError] = useState<string | null>(null)

	const applySuggestedMetadata = useCallback(() => {
		if (stagedChanges.length === 0) {
			setCommitMessage('')
			setPullRequestTitle('')
			return
		}

		const metadata = generateDevStudioPushMetadata(stagedChanges)
		setCommitMessage(metadata.commitMessage)
		setPullRequestTitle(metadata.pullRequestTitle)
	}, [stagedChanges])

	useEffect(() => {
		applySuggestedMetadata()
	}, [applySuggestedMetadata])

	const handlePush = useCallback(async () => {
		setPushError(null)
		try {
			await pushStagedChanges(commitMessage, pullRequestTitle)
			setCommitMessage('')
			setPullRequestTitle('')
		} catch (caught) {
			setPushError(
				caught instanceof Error ? caught.message : 'Could not push changes.',
			)
		}
	}, [commitMessage, pullRequestTitle, pushStagedChanges])

	if (stagedChanges.length === 0) {
		return (
			<div className="flex h-full items-center justify-center px-6 py-10 text-center">
				<div>
					<p className="text-sm font-medium">No staged changes</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Edit files in the IDE or ask the agent to stage changes for review here.
					</p>
					{lastPushResult ? (
						<div className="mt-4 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-left">
							<p className="text-xs font-medium text-muted-foreground uppercase">
								Last push
							</p>
							<p className="mt-1 text-sm">
								Branch <span className="font-mono">{lastPushResult.branchName}</span>
							</p>
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
				</div>
			</div>
		)
	}

	return (
		<div className={cn('flex h-full min-h-0 flex-col', className)}>
			<div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-sm font-medium">Staged changes</p>
						<p className="text-xs text-muted-foreground">
							Commit message and PR title are suggested from your edits
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={discardAllStagedChanges}
							disabled={isPushing}
						>
							Discard all
						</Button>
					</div>
				</div>

				<div className="grid gap-2">
					<textarea
						value={commitMessage}
						onChange={(event) => setCommitMessage(event.target.value)}
						placeholder="Commit message"
						rows={3}
						className="resize-none rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
					/>
					<input
						type="text"
						value={pullRequestTitle}
						onChange={(event) => setPullRequestTitle(event.target.value)}
						placeholder="Pull request title"
						className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
					/>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={applySuggestedMetadata}
							disabled={isPushing}
						>
							<RefreshCw className="h-4 w-4" />
							Regenerate
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => void handlePush()}
							disabled={isPushing}
						>
							{isPushing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<GitCommitHorizontal className="h-4 w-4" />
							)}
							Push branch & open PR
						</Button>
					</div>
					{pushError ? (
						<div className="space-y-1">
							<p className="text-xs text-destructive">{pushError}</p>
							{pushError.includes('personal access token') ? (
								<p className="text-xs text-muted-foreground">
									Settings → App → GitHub token needs Contents (R/W) and Pull
									requests (R/W) for this repo.
								</p>
							) : null}
						</div>
					) : null}
				</div>
			</div>

			<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
				{stagedChanges.map((change) => (
					<article
						key={change.id}
						className="overflow-hidden rounded-xl border border-border/60 bg-background/30"
					>
						<div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
							<div className="min-w-0">
								<p className="truncate font-mono text-xs">{change.path}</p>
								<p className="mt-0.5 text-[11px] text-muted-foreground capitalize">
									{change.status} · {change.source}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => discardStagedChange(change.id)}
								disabled={isPushing}
								aria-label={`Discard ${change.path}`}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
						<div className="grid gap-px bg-border/60 md:grid-cols-2">
							<DiffBlock label="Before" content={change.oldContent} tone="removed" />
							<DiffBlock label="After" content={change.newContent} tone="added" />
						</div>
					</article>
				))}
			</div>
		</div>
	)
}

function DiffBlock({
	label,
	content,
	tone,
}: {
	label: string
	content: string
	tone: 'removed' | 'added'
}) {
	return (
		<div
			className={cn(
				'min-w-0 bg-background/50 p-3',
				tone === 'removed' && 'md:border-r md:border-border/60',
			)}
		>
			<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
				{label}
			</p>
			<pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
				{content || '(empty)'}
			</pre>
		</div>
	)
}
