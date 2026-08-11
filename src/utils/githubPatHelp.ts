export const DEV_STUDIO_PAT_PERMISSIONS = [
	{
		name: 'Metadata',
		level: 'Read-only',
		why: 'Required baseline for all repository API calls.',
	},
	{
		name: 'Contents',
		level: 'Read and write',
		why: 'Creates commits via GitHub Git API (blobs, trees, branches). Read-only is not enough to push.',
	},
	{
		name: 'Pull requests',
		level: 'Read and write',
		why: 'Opens and merges pull requests. Read-only can list PRs but cannot create or merge them.',
	},
	{
		name: 'Administration',
		level: 'Read and write',
		why: 'Only needed if you create new repositories from Dev Studio (+ button).',
		optional: true,
	},
] as const

export function formatRequiredPatPermissions(
	requiredPermissionsHeader: string | null | undefined,
): string | null {
	if (!requiredPermissionsHeader?.trim()) {
		return null
	}

	return requiredPermissionsHeader
		.split(';')
		.map((group) =>
			group
				.split(',')
				.map((part) => part.trim().replace(/=/g, ': '))
				.join(', '),
		)
		.join(' OR ')
}

export function buildPatPermissionErrorHint(options?: {
	step?: string
	requiredPermissions?: string | null
}): string {
	const parts: string[] = []

	if (options?.step) {
		parts.push(`Failed while ${options.step}.`)
	}

	parts.push(
		'Fine-grained PAT checklist for Dev Studio push + PR:',
		'• Repository access: include this repo (or All repositories)',
		'• Contents: Read and write (not Read-only)',
		'• Pull requests: Read and write (not Read-only)',
	)

	const formatted = formatRequiredPatPermissions(options?.requiredPermissions)
	if (formatted) {
		parts.push(`GitHub says this call needs: ${formatted}`)
	}

	parts.push(
		'Pull requests permission alone does not cover git commits — Contents Read and write is separate and required.',
	)

	return parts.join('\n')
}
