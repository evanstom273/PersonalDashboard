import {
	DEV_STUDIO_AGENT_TIMEOUT_MS,
	DEV_STUDIO_AGENT_WARNING_MS,
} from '@/services/devStudio/devStudioAgentTypes'

export interface DevStudioWallClockGuard {
	clear: () => void
	didTimeout: () => boolean
}

export function startDevStudioAgentWallClockGuard(options: {
	abortController: AbortController
	onWarning?: () => void
}): DevStudioWallClockGuard {
	let timedOut = false

	const warningTimer = window.setTimeout(() => {
		options.onWarning?.()
	}, DEV_STUDIO_AGENT_WARNING_MS)

	const timeoutTimer = window.setTimeout(() => {
		timedOut = true
		options.abortController.abort()
	}, DEV_STUDIO_AGENT_TIMEOUT_MS)

	return {
		clear: () => {
			window.clearTimeout(warningTimer)
			window.clearTimeout(timeoutTimer)
		},
		didTimeout: () => timedOut,
	}
}
