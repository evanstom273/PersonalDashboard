import type { DevStudioAgentTaskStatus } from '@/types/devStudio'

export interface DevStudioAgentRunResult {
	text: string
	status: Exclude<DevStudioAgentTaskStatus, 'idle' | 'running'>
}

export const DEV_STUDIO_LIMIT_REACHED_MESSAGE =
	'I reached the tool iteration limit before finishing. Use Resume in chat to continue with a fresh step budget, or narrow the request.'

export const DEV_STUDIO_AUTO_CONTINUE_MAX_ROUNDS = 3

export const DEV_STUDIO_AGENT_WARNING_MS = 5 * 60 * 1000
export const DEV_STUDIO_AGENT_TIMEOUT_MS = 15 * 60 * 1000

export const DEV_STUDIO_TIMEOUT_MESSAGE =
	'Stopped after 15 minutes to prevent a runaway task. Use Resume to continue if needed.'
