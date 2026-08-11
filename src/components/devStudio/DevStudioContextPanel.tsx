import { useDevStudio } from '@/providers/DevStudioProvider'
import type { DevStudioContextTab } from '@/types/devStudio'
import { DevStudioChangesPanel } from '@/components/devStudio/DevStudioChangesPanel'
import { DevStudioDiffPanel } from '@/components/devStudio/DevStudioDiffPanel'
import { DevStudioEditorPanel } from '@/components/devStudio/DevStudioEditorPanel'
import { DevStudioFilesPanel } from '@/components/devStudio/DevStudioFilesPanel'
import { DevStudioGitPanel } from '@/components/devStudio/DevStudioGitPanel'
import { cn } from '@/utils/cn'

const CONTEXT_TABS: Array<{ id: DevStudioContextTab; label: string }> = [
	{ id: 'editor', label: 'Editor' },
	{ id: 'files', label: 'Files' },
	{ id: 'changes', label: 'Changes' },
	{ id: 'git', label: 'Git' },
]

export function DevStudioContextPanel({ className }: { className?: string }) {
	const { contextTab, setContextTab, stagedChanges, openFile } = useDevStudio()

	return (
		<aside
			className={cn(
				'flex min-h-0 min-w-0 flex-col border-l border-border/70 bg-card/20',
				className,
			)}
		>
			<div className="dev-studio-context-tabs shrink-0 border-b border-border/60 px-3 py-2">
				<div className="flex flex-wrap gap-1">
					{CONTEXT_TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setContextTab(tab.id)}
							className={cn(
								'relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
								contextTab === tab.id
									? 'bg-primary/15 text-primary'
									: 'text-muted-foreground hover:bg-accent hover:text-foreground',
							)}
						>
							{tab.label}
							{tab.id === 'changes' && stagedChanges.length > 0 ? (
								<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
							) : null}
							{tab.id === 'editor' && openFile?.isDirty ? (
								<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
							) : null}
						</button>
					))}
				</div>
			</div>

			<div className="min-h-0 flex-1">
				{contextTab === 'editor' ? <DevStudioEditorPanel /> : null}
				{contextTab === 'git' ? <DevStudioGitPanel /> : null}
				{contextTab === 'changes' ? (
					stagedChanges.length > 0 ? (
						<DevStudioDiffPanel />
					) : (
						<DevStudioChangesPanel />
					)
				) : null}
				{contextTab === 'files' ? <DevStudioFilesPanel /> : null}
			</div>
		</aside>
	)
}
