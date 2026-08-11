import { useDevStudio } from '@/providers/DevStudioProvider'
import type { DevStudioMobileTab } from '@/types/devStudio'
import { cn } from '@/utils/cn'

const MOBILE_TABS: Array<{ id: DevStudioMobileTab; label: string }> = [
	{ id: 'chat', label: 'Chat' },
	{ id: 'editor', label: 'Editor' },
	{ id: 'diff', label: 'Diff' },
	{ id: 'files', label: 'Files' },
	{ id: 'git', label: 'Git' },
]

export function DevStudioMobileTabs() {
	const { mobileTab, setMobileTab, stagedChanges, openFile } = useDevStudio()

	return (
		<div className="dev-studio-mobile-tabs shrink-0 border-b border-border/60 px-3 py-2">
			<div className="grid grid-cols-5 gap-1">
				{MOBILE_TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setMobileTab(tab.id)}
						className={cn(
							'relative rounded-lg px-1 py-2 text-[11px] font-medium transition-colors sm:px-2 sm:text-xs',
							mobileTab === tab.id
								? 'bg-primary/15 text-primary'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground',
						)}
					>
						{tab.label}
						{tab.id === 'diff' && stagedChanges.length > 0 ? (
							<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
						) : null}
						{tab.id === 'editor' && openFile?.isDirty ? (
							<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
						) : null}
					</button>
				))}
			</div>
		</div>
	)
}
