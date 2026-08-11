import { stagedChangesNeedWorkflowsPermission } from '@/utils/devStudioWorkflowPaths'

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
		name: 'Workflows',
		level: 'Read and write',
		why: 'Required when pushing edits to .github/workflows/* (e.g. deploy.yml). Contents alone cannot update workflow files.',
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
	stagedPaths?: string[]
}): string {
	const parts: string[] = []
	const needsWorkflows =
		options?.stagedPaths && stagedChangesNeedWorkflowsPermission(options.stagedPaths)
	const treeStepFailed = options?.step === 'building commit tree'

	if (options?.step) {
		parts.push(`Failed while ${options.step}.`)
	}

	if (needsWorkflows || treeStepFailed) {
		parts.push(
			'Your staged changes include GitHub Actions workflow files (.github/workflows/*).',
			'GitHub requires Workflows: Read and write in addition to Contents: Read and write.',
			'This is why a push with only package.json can succeed, then a push with deploy.yml fails.',
		)
	}

	parts.push(
		'Fine-grained PAT checklist for Dev Studio push + PR:',
		'• Repository access: All repositories (or include this repo)',
		'• Contents: Read and write (not Read-only)',
		'• Pull requests: Read and write (not Read-only)',
	)

	if (needsWorkflows || treeStepFailed) {
		parts.push('• Workflows: Read and write (required for .github/workflows/* edits)')
	}

	const formatted = formatRequiredPatPermissions(options?.requiredPermissions)
	if (formatted) {
		parts.push(`GitHub says this call needs: ${formatted}`)
	}

	return parts.join('\n')
}

export function formatGitHubApiErrorForPush(
	error: {
		message: string
		status: number
		step?: string
		requiredPermissions?: string
	},
	stagedPaths?: string[],
): string {
	if (
		error.status !== 403 ||
		!error.message.includes('Resource not accessible by personal access token')
	) {
		return error.message
	}

	return `${error.message}\n\n${buildPatPermissionErrorHint({
		step: error.step,
		requiredPermissions: error.requiredPermissions,
		stagedPaths,
	})}`
}
