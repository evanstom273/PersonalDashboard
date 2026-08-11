import { DEV_STUDIO_PAT_PERMISSIONS } from '@/utils/githubPatHelp'

export function DevStudioPatPermissionsHelp() {
	return (
		<div className="rounded-lg border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
			<p className="font-medium text-foreground">Fine-grained token permissions</p>
			<p className="mt-2">
				Push uses two separate permissions. Both must be{' '}
				<span className="text-foreground">Read and write</span> — Read-only on either
				will fail when opening a PR, even if the first push seemed to work.
			</p>
			<ul className="mt-3 space-y-2">
				{DEV_STUDIO_PAT_PERMISSIONS.map((permission) => (
					<li key={permission.name}>
						<span className="font-medium text-foreground">
							{permission.name}
							{'optional' in permission && permission.optional ? ' (optional)' : ''}:
						</span>{' '}
						{permission.level} — {permission.why}
					</li>
				))}
			</ul>
		</div>
	)
}
