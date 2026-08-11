import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'

interface DevStudioRepositorySelectProps {
	repository: string
	branch: string
	onRepositoryChange: (value: string) => void
	onBranchChange: (value: string) => void
}

export function DevStudioRepositorySelect({
	repository,
	branch,
	onRepositoryChange,
	onBranchChange,
}: DevStudioRepositorySelectProps) {
	const {
		repositoryOptions,
		isLoadingRepositories,
		repositoryListError,
		loadRepositories,
	} = useDevStudio()

	function handleSelect(fullName: string): void {
		onRepositoryChange(fullName)
		const selected = repositoryOptions.find((repo) => repo.fullName === fullName)
		if (selected) {
			onBranchChange(selected.defaultBranch)
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void loadRepositories()}
					disabled={isLoadingRepositories}
				>
					{isLoadingRepositories ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
					{isLoadingRepositories ? 'Loading…' : 'Load repositories'}
				</Button>
				{repositoryOptions.length > 0 ? (
					<span className="text-xs text-muted-foreground">
						{repositoryOptions.length} repo
						{repositoryOptions.length === 1 ? '' : 's'} available
					</span>
				) : null}
			</div>

			{repositoryOptions.length > 0 ? (
				<label className="block space-y-2 text-sm">
					<span className="font-medium">Choose repository</span>
					<select
						value={repository}
						onChange={(event) => handleSelect(event.target.value)}
						className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="">Select a repository…</option>
						{repositoryOptions.map((repo) => (
							<option key={repo.fullName} value={repo.fullName}>
								{repo.fullName}
								{repo.isPrivate ? ' (private)' : ''}
							</option>
						))}
					</select>
				</label>
			) : null}

			<label className="block space-y-2 text-sm">
				<span className="font-medium">Or enter manually</span>
				<input
					value={repository}
					onChange={(event) => onRepositoryChange(event.target.value)}
					placeholder="owner/repo"
					className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
				/>
			</label>

			<label className="block space-y-2 text-sm">
				<span className="font-medium">Default branch</span>
				<input
					value={branch}
					onChange={(event) => onBranchChange(event.target.value)}
					placeholder="main"
					className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
				/>
			</label>

			{repositoryListError ? (
				<p className="text-xs text-destructive">{repositoryListError}</p>
			) : null}
		</div>
	)
}
