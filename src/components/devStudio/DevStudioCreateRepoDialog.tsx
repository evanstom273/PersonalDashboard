import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { createRepository } from '@/services/github/githubApiService'
import {
	getRepositoryNameError,
	normalizeRepositoryName,
} from '@/utils/githubRepoName'

interface DevStudioCreateRepoDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function DevStudioCreateRepoDialog({
	open,
	onOpenChange,
}: DevStudioCreateRepoDialogProps) {
	const { preferences } = usePreferencesContext()
	const { switchRepository, registerRepository, loadRepositories } = useDevStudio()
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [isPrivate, setIsPrivate] = useState(true)
	const [autoInit, setAutoInit] = useState(true)
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleCreate(): Promise<void> {
		const normalizedName = normalizeRepositoryName(name)
		const validationError = getRepositoryNameError(normalizedName)
		if (validationError) {
			setError(validationError)
			return
		}

		const token = preferences.githubPat.trim()
		if (!token) {
			setError('Add a GitHub token in Settings first.')
			return
		}

		setIsCreating(true)
		setError(null)

		try {
			const result = await createRepository(token, {
				name: normalizedName,
				description,
				isPrivate,
				autoInit,
			})

			registerRepository(result.repository)
			await switchRepository(
				result.repository.fullName,
				result.repository.defaultBranch,
			)
			await loadRepositories({ retries: 3 })

			setName('')
			setDescription('')
			setIsPrivate(true)
			setAutoInit(true)
			onOpenChange(false)
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: 'Could not create repository.',
			)
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
				<DialogHeader>
					<DialogTitle>Create repository</DialogTitle>
					<DialogDescription>
						Create a new GitHub repo under your account and open it in Dev
						Studio.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<label className="block space-y-2 text-sm">
						<span className="font-medium">Repository name</span>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="roll-the-ropes"
							className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
							autoComplete="off"
						/>
					</label>

					<label className="block space-y-2 text-sm">
						<span className="font-medium">Description</span>
						<input
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Optional"
							className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
						/>
					</label>

					<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
						<input
							type="checkbox"
							checked={isPrivate}
							onChange={(event) => setIsPrivate(event.target.checked)}
							className="mt-0.5"
						/>
						<span>
							<span className="block font-medium">Private repository</span>
							<span className="mt-1 block text-muted-foreground">
								Only you and collaborators can see it.
							</span>
						</span>
					</label>

					<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
						<input
							type="checkbox"
							checked={autoInit}
							onChange={(event) => setAutoInit(event.target.checked)}
							className="mt-0.5"
						/>
						<span>
							<span className="block font-medium">Initialize with README</span>
							<span className="mt-1 block text-muted-foreground">
								Recommended so Dev Studio can load the repo immediately.
							</span>
						</span>
					</label>

					<p className="text-xs text-muted-foreground">
						Your token needs permission to create repositories. For fine-grained
						tokens, enable Administration (read and write) on your account.
					</p>

					{error ? <p className="text-xs text-destructive">{error}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isCreating}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => void handleCreate()}
						disabled={isCreating}
					>
						{isCreating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						{isCreating ? 'Creating…' : 'Create repository'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function DevStudioCreateRepoButton() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={() => setOpen(true)}
				aria-label="Create repository"
			>
				<Plus className="h-4 w-4" />
			</Button>
			<DevStudioCreateRepoDialog open={open} onOpenChange={setOpen} />
		</>
	)
}
