import { generateDevStudioChat } from '@/services/devStudio/devStudioAgent'
import {
	DEV_STUDIO_AUTO_CONTINUE_MAX_ROUNDS,
	DEV_STUDIO_LIMIT_REACHED_MESSAGE,
	type DevStudioAgentRunResult,
} from '@/services/devStudio/devStudioAgentTypes'
import type { DevStudioToolContext } from '@/services/devStudio/devStudioWorkspaceTools'
import { getMaxIterationsForModel } from '@/services/devStudio/devStudioModels'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import type { DevStudioAgentPhase, DevStudioRepoRef } from '@/types/devStudio'
import { buildDevStudioResumeUserMessage } from '@/utils/devStudioTaskStatus'

export interface DevStudioAgentStreamCallbacks {
	signal?: AbortSignal
	onThoughtDelta?: (delta: string) => void
	onTextDelta?: (delta: string) => void
	onPhaseChange?: (phase: DevStudioAgentPhase) => void
	onToolStart?: (toolName: string, args: Record<string, unknown>) => void
	onToolComplete?: (toolName: string) => void
}

export async function runDevStudioAgentWithContinue(
	apiKey: string,
	modelId: string,
	initialMessages: StoredMessage[],
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	toolContext: DevStudioToolContext,
	callbacks: DevStudioAgentStreamCallbacks,
	options?: {
		autoContinue?: boolean
		isResume?: boolean
	},
): Promise<DevStudioAgentRunResult> {
	let messages = initialMessages
	let continueRound = 0
	const maxIterations = getMaxIterationsForModel(modelId)

	while (true) {
		const result = await generateDevStudioChat(
			apiKey,
			modelId,
			messages,
			preferences,
			repo,
			toolContext,
			callbacks,
		)

		if (result.status !== 'limit_reached') {
			return result
		}

		const shouldAutoContinue =
			options?.autoContinue === true && continueRound < DEV_STUDIO_AUTO_CONTINUE_MAX_ROUNDS

		if (!shouldAutoContinue) {
			return {
				status: 'limit_reached',
				text: result.text || DEV_STUDIO_LIMIT_REACHED_MESSAGE,
			}
		}

		continueRound += 1
		const resumeMessage: StoredMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: buildDevStudioResumeUserMessage(
				toolContext.getStagedChanges(),
				modelId,
			),
			createdAt: Date.now(),
		}

		messages = [
			...messages,
			{
				id: crypto.randomUUID(),
				role: 'assistant',
				content:
					result.text ||
					`I used all ${maxIterations} tool steps but have not finished yet. Continuing automatically…`,
				createdAt: Date.now(),
			},
			resumeMessage,
		]
	}
}
