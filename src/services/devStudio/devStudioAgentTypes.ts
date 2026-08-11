import type { DevStudioAgentTaskStatus } from '@/types/devStudio'

export interface DevStudioAgentRunResult {
	text: string
	status: Exclude<DevStudioAgentTaskStatus, 'idle' | 'running'>
}

export const DEV_STUDIO_LIMIT_REACHED_MESSAGE =
	'I reached the tool iteration limit before finishing. Use Resume in chat to continue with a fresh step budget, or narrow the request.'

export const DEV_STUDIO_AUTO_CONTINUE_MAX_ROUNDS = 3
