import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	findRepositoryBranch,
	useGitHubRepositories,
} from '@/hooks/useGitHubRepositories'

interface DevStudioRepositorySelectProps {
	githubPat: string
	repository: string
	branch: string
	onRepositoryChange: (value: string) => void
	onBranchChange: (value: string) => void
}

export function DevStudioRepositorySelect({
	githubPat,
	repository,
	branch,
	onRepositoryChange,
	onBranchChange,
}: DevStudioRepositorySelectProps) {
	const { repositories, isLoading, error, hasLoaded, loadRepositories } =
		useGitHubRepositories(githubPat)

	function handleSelect(fullName: string): void {
		onRepositoryChange(fullName)
		const defaultBranch = findRepositoryBranch(repositories, fullName)
		if (defaultBranch) {
			onBranchChange(defaultBranch)
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
					disabled={isLoading || !githubPat.trim()}
				>
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
					{isLoading ? 'Loading…' : hasLoaded ? 'Refresh repos' : 'Load repositories'}
				</Button>
				{hasLoaded ? (
					<span className="text-xs text-muted-foreground">
						{repositories.length} repo{repositories.length === 1 ? '' : 's'} available
					</span>
				) : null}
			</div>

			{repositories.length > 0 ? (
				<label className="block space-y-2 text-sm">
					<span className="font-medium">Choose repository</span>
					<select
						value={repository}
						onChange={(event) => handleSelect(event.target.value)}
						className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="">Select a repository…</option>
						{repositories.map((repo) => (
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

			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	)
}
