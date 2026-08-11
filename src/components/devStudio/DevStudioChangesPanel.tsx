import { CloudUpload, HardDrive, History } from 'lucide-react'
import { useDevStudio } from '@/providers/DevStudioProvider'

export function DevStudioChangesPanel() {
	const {
		workspace,
		connectionStatus,
		stagedChanges,
		rateLimit,
	} = useDevStudio()

	return (
		<div className="flex h-full min-h-0 flex-col px-4 py-4">
			<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Workspace
			</p>

			<div className="mt-3 space-y-3">
				<StatCard
					icon={HardDrive}
					label="Virtual workspace"
					value={
						workspace
							? `Synced ${new Date(workspace.lastSyncedAt).toLocaleString()}`
							: 'Not loaded'
					}
				/>
				<StatCard
					icon={CloudUpload}
					label="Staged changes"
					value={`${stagedChanges.length} file${stagedChanges.length === 1 ? '' : 's'}`}
				/>
				<StatCard
					icon={History}
					label="GitHub API"
					value={
						rateLimit
							? `${rateLimit.remaining} / ${rateLimit.limit} calls left`
							: connectionStatus === 'connected'
								? 'Connected'
								: 'Waiting to connect'
					}
				/>
			</div>

			<div className="mt-6 rounded-xl border border-dashed border-border/70 bg-background/20 p-4">
				<p className="text-sm font-medium">Push flow (coming next)</p>
				<p className="mt-2 text-sm text-muted-foreground">
					Approve staged diffs, create a branch, commit via GitHub&apos;s Git
					data API, and open a pull request — all from here.
				</p>
			</div>
		</div>
	)
}

function StatCard({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof HardDrive
	label: string
	value: string
}) {
	return (
		<div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-3">
			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
				<Icon className="h-4 w-4 text-primary" />
			</span>
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="mt-0.5 text-sm font-medium">{value}</p>
			</div>
		</div>
	)
}
