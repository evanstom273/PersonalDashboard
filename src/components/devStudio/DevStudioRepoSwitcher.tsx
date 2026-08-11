import { ChevronDown, FolderGit2, Loader2 } from 'lucide-react'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { cn } from '@/utils/cn'

export function DevStudioRepoSwitcher() {
	const {
		isConfigured,
		repositorySlug,
		branch,
		connectionStatus,
		switchRepository,
		repositoryOptions,
		isLoadingRepositories,
	} = useDevStudio()

	if (!isConfigured) {
		return (
			<div className="flex min-w-0 items-center gap-2">
				<FolderGit2 className="h-4 w-4 shrink-0 text-primary" />
				<h1 className="truncate text-base font-semibold">Dev Studio</h1>
			</div>
		)
	}

	const isSwitching = connectionStatus === 'connecting'

	return (
		<div className="min-w-0 max-w-full">
			<label className="sr-only" htmlFor="dev-studio-repo-switcher">
				Active repository
			</label>
			<div className="flex min-w-0 items-center gap-2">
				<FolderGit2 className="h-4 w-4 shrink-0 text-primary" />
				<div className="relative min-w-0 flex-1">
					<select
						id="dev-studio-repo-switcher"
						value={repositorySlug}
						disabled={isSwitching || repositoryOptions.length === 0}
						onChange={(event) => {
							const fullName = event.target.value
							if (!fullName || fullName === repositorySlug) {
								return
							}

							const selected = repositoryOptions.find(
								(repo) => repo.fullName === fullName,
							)
							void switchRepository(
								fullName,
								selected?.defaultBranch ?? branch,
							)
						}}
						className={cn(
							'w-full max-w-[min(100%,18rem)] appearance-none truncate rounded-lg border border-border/60',
							'bg-background/60 py-1.5 pr-8 pl-2 text-base font-semibold outline-none',
							'focus:ring-2 focus:ring-ring',
							(isSwitching || isLoadingRepositories) && 'opacity-60',
						)}
					>
						{repositoryOptions.map((repo) => (
							<option key={repo.fullName} value={repo.fullName}>
								{repo.fullName}
								{repo.isPrivate ? ' (private)' : ''}
							</option>
						))}
					</select>
					{isSwitching || isLoadingRepositories ? (
						<Loader2 className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
					) : (
						<ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					)}
				</div>
			</div>
		</div>
	)
}
