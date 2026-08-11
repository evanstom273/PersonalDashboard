import { GitCommitHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { cn } from '@/utils/cn'

export function DevStudioDiffPanel() {
	const { stagedChanges, discardStagedChange } = useDevStudio()

	if (stagedChanges.length === 0) {
		return (
			<div className="flex h-full items-center justify-center px-6 py-10 text-center">
				<div>
					<p className="text-sm font-medium">No pushed changes</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Agent edits will appear here for review before commit.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
				<div>
					<p className="text-sm font-medium">Staged changes</p>
					<p className="text-xs text-muted-foreground">
						Review before pushing to GitHub
					</p>
				</div>
				<div className="flex gap-2">
					<Button type="button" size="sm" variant="outline" disabled>
						Discard all
					</Button>
					<Button type="button" size="sm" disabled>
						<GitCommitHorizontal className="h-4 w-4" />
						Commit
					</Button>
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
									{change.status}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => discardStagedChange(change.id)}
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
				{content}
			</pre>
		</div>
	)
}
