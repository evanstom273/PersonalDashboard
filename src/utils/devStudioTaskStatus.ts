import type {
	DevStudioAgentTaskStatus,
	DevStudioStagedChange,
} from '@/types/devStudio'
import { getMaxIterationsForModel } from '@/services/devStudio/devStudioModels'

export interface DevStudioTaskStatusPresentation {
	label: string
	shortLabel: string
	tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

export function getDevStudioTaskStatusPresentation(
	status: DevStudioAgentTaskStatus,
): DevStudioTaskStatusPresentation {
	switch (status) {
		case 'running':
			return {
				label: 'Agent drafting…',
				shortLabel: 'Drafting',
				tone: 'info',
			}
		case 'completed':
			return {
				label: 'Ready for review',
				shortLabel: 'Ready',
				tone: 'success',
			}
		case 'limit_reached':
			return {
				label: 'Incomplete run — iteration limit',
				shortLabel: 'Incomplete',
				tone: 'warning',
			}
		case 'stopped':
			return {
				label: 'Incomplete run — stopped',
				shortLabel: 'Stopped',
				tone: 'warning',
			}
		case 'error':
			return {
				label: 'Agent error',
				shortLabel: 'Error',
				tone: 'danger',
			}
		default:
			return {
				label: 'No active agent task',
				shortLabel: 'Idle',
				tone: 'neutral',
			}
	}
}

export function hasAgentStagedChanges(stagedChanges: DevStudioStagedChange[]): boolean {
	return stagedChanges.some((change) => change.source === 'agent')
}

export interface DevStudioPushSafety {
	allowed: boolean
	reason: string | null
	requiresConfirmation: boolean
}

export function getDevStudioPushSafety(
	agentTaskStatus: DevStudioAgentTaskStatus,
	stagedChanges: DevStudioStagedChange[],
): DevStudioPushSafety {
	if (stagedChanges.length === 0) {
		return { allowed: false, reason: 'No staged changes to push.', requiresConfirmation: false }
	}

	if (agentTaskStatus === 'running') {
		return {
			allowed: false,
			reason: 'Wait for the agent to finish before pushing staged changes.',
			requiresConfirmation: false,
		}
	}

	if (!hasAgentStagedChanges(stagedChanges)) {
		return { allowed: true, reason: null, requiresConfirmation: false }
	}

	if (agentTaskStatus === 'completed' || agentTaskStatus === 'idle') {
		return { allowed: true, reason: null, requiresConfirmation: false }
	}

	return {
		allowed: false,
		reason:
			'Staged changes are from an incomplete agent run. Resume the task in Chat or review diffs carefully before pushing.',
		requiresConfirmation: true,
	}
}

export function buildDevStudioResumeUserMessage(
	stagedChanges: DevStudioStagedChange[],
	modelId: string,
): string {
	const stagedPaths = stagedChanges.map((change) => `- ${change.path} (${change.status})`)
	const maxIterations = getMaxIterationsForModel(modelId)

	return [
		'Continue the previous Dev Studio task from where you left off.',
		`You have up to ${maxIterations} more tool steps.`,
		'Review list_staged_changes first, then finish any remaining edits.',
		'When done, summarize what you completed and confirm the task is ready for review.',
		stagedPaths.length > 0
			? `Currently staged:\n${stagedPaths.join('\n')}`
			: 'No files are staged yet — pick up the plan from our chat history.',
	].join('\n\n')
}
