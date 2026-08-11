import { DEV_STUDIO_PAT_PERMISSIONS } from '@/utils/githubPatHelp'

export function DevStudioPatPermissionsHelp() {
	return (
		<div className="rounded-lg border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
			<p className="font-medium text-foreground">Fine-grained token permissions</p>
			<p className="mt-2">
				Push needs <span className="text-foreground">Contents</span> and{' '}
				<span className="text-foreground">Pull requests</span> both set to{' '}
				<span className="text-foreground">Read and write</span>. Pushing{' '}
				<code className="text-foreground">.github/workflows/*</code> also requires{' '}
				<span className="text-foreground">Workflows: Read and write</span>.
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
