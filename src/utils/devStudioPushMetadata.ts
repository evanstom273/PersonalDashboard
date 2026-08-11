import type { DevStudioStagedChange } from '@/types/devStudio'

export interface DevStudioPushMetadata {
	commitMessage: string
	pullRequestTitle: string
	pullRequestBody: string
}

function formatPushTimestamp(date = new Date()): string {
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function describeFileChange(change: DevStudioStagedChange): string {
	const fileName = change.path.split('/').pop() ?? change.path
	switch (change.status) {
		case 'added':
			return `Add ${fileName}`
		case 'deleted':
			return `Remove ${fileName}`
		default:
			return `Update ${fileName}`
	}
}

function summarizeChanges(stagedChanges: DevStudioStagedChange[]): string {
	if (stagedChanges.length === 1) {
		return describeFileChange(stagedChanges[0])
	}

	const verbs = new Set(stagedChanges.map((change) => change.status))
	let verb = 'Update'
	if (verbs.size === 1) {
		if (verbs.has('added')) {
			verb = 'Add'
		} else if (verbs.has('deleted')) {
			verb = 'Remove'
		}
	}

	const preview = stagedChanges
		.slice(0, 3)
		.map((change) => change.path.split('/').pop() ?? change.path)
		.join(', ')

	const suffix =
		stagedChanges.length > 3 ? ` +${stagedChanges.length - 3} more` : ''

	return `${verb} ${stagedChanges.length} files (${preview}${suffix})`
}

function describeSources(stagedChanges: DevStudioStagedChange[]): string {
	const sources = new Set(stagedChanges.map((change) => change.source))
	if (sources.has('agent') && sources.has('user')) {
		return 'Dev Studio'
	}
	if (sources.has('agent')) {
		return 'Dev Studio agent'
	}
	return 'Dev Studio'
}

export function generateDevStudioPushMetadata(
	stagedChanges: DevStudioStagedChange[],
	overrides?: {
		commitMessage?: string
		pullRequestTitle?: string
	},
): DevStudioPushMetadata {
	if (stagedChanges.length === 0) {
		throw new Error('No staged changes to push.')
	}

	const timestamp = formatPushTimestamp()
	const summary = summarizeChanges(stagedChanges)
	const sourceLabel = describeSources(stagedChanges)

	const generatedCommit = `${summary}\n\n${sourceLabel} · ${timestamp}`
	const generatedTitle = `Dev Studio: ${summary}`

	const commitMessage = overrides?.commitMessage?.trim() || generatedCommit
	const pullRequestTitle = overrides?.pullRequestTitle?.trim() || generatedTitle

	const changeLines = stagedChanges
		.map(
			(change) =>
				`- \`${change.status}\` \`${change.path}\` (${change.source})`,
		)
		.join('\n')

	const pullRequestBody = [
		'## Summary',
		'',
		summary,
		'',
		'## Changes',
		changeLines,
		'',
		`Pushed from ${sourceLabel} on ${timestamp}.`,
	].join('\n')

	return {
		commitMessage,
		pullRequestTitle,
		pullRequestBody,
	}
}
