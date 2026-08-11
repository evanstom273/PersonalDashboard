import { getValue, setValue } from '@/storage/storageService'
import type { DevStudioRepoRef, DevStudioStagedChange } from '@/types/devStudio'
import { formatRepositorySlug } from '@/types/devStudio'

export interface DevStudioPersistedWorkspace {
	repoKey: string
	stagedChanges: DevStudioStagedChange[]
	fileShaByPath: Record<string, string>
	messages: Array<{
		id: string
		role: 'user' | 'assistant'
		content: string
		createdAt: number
	}>
}

export function buildWorkspaceCacheKey(repo: DevStudioRepoRef): string {
	return `dev-studio:${formatRepositorySlug(repo)}@${repo.branch}`
}

export async function loadPersistedWorkspace(
	repo: DevStudioRepoRef,
): Promise<DevStudioPersistedWorkspace | null> {
	const key = buildWorkspaceCacheKey(repo)
	const stored = await getValue<DevStudioPersistedWorkspace>('cache', key)
	if (!stored || stored.repoKey !== key) {
		return null
	}
	return stored
}

export async function savePersistedWorkspace(
	repo: DevStudioRepoRef,
	state: Omit<DevStudioPersistedWorkspace, 'repoKey'>,
): Promise<void> {
	const repoKey = buildWorkspaceCacheKey(repo)
	await setValue('cache', repoKey, {
		repoKey,
		...state,
	})
}
