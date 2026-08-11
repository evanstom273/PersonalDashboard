export type DevStudioContextTab = 'git' | 'changes' | 'files' | 'editor'

export type DevStudioMobileTab = 'chat' | 'diff' | 'files' | 'editor' | 'git'

export type DevStudioConnectionStatus =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'error'

export interface DevStudioRepoRef {
	owner: string
	repo: string
	branch: string
}

export interface DevStudioFileNode {
	path: string
	type: 'file' | 'dir'
	sha?: string
	children?: DevStudioFileNode[]
}

export interface DevStudioPullRequest {
	id: number
	number: number
	title: string
	state: 'open' | 'closed'
	merged: boolean
	headRef: string
	baseRef: string
	updatedAt: string
}

export interface DevStudioMergedPullRequest {
	number: number
	title: string
	headRef: string
	baseRef: string
	mergedAt: number
}

export type DevStudioAgentPhase = 'thinking' | 'tool' | 'writing'

export type DevStudioAgentTaskStatus =
	| 'idle'
	| 'running'
	| 'completed'
	| 'limit_reached'
	| 'stopped'
	| 'error'

export type DevStudioAgentActivityStatus = 'running' | 'done' | 'failed'

export interface DevStudioAgentActivity {
	id: string
	label: string
	status: DevStudioAgentActivityStatus
	startedAt: number
	endedAt?: number
	errorMessage?: string
}

export interface DevStudioStreamingState {
	id: string
	content: string
	thoughts: string
	phase: DevStudioAgentPhase
	startedAt: number
	activities: DevStudioAgentActivity[]
	showLongRunWarning?: boolean
}

export interface DevStudioStagedChange {
	id: string
	path: string
	status: 'added' | 'modified' | 'deleted'
	oldContent: string
	newContent: string
	source: 'user' | 'agent'
	baseSha?: string
}

export interface DevStudioOpenFile {
	path: string
	content: string
	originalContent: string
	sha?: string
	isDirty: boolean
	isLoading: boolean
	error: string | null
}

export interface DevStudioPushResult {
	branchName: string
	commitSha: string
	pullRequestNumber: number
	pullRequestUrl: string
}

export interface DevStudioWorkspaceSnapshot {
	repo: DevStudioRepoRef
	tree: DevStudioFileNode[]
	pullRequests: DevStudioPullRequest[]
	lastSyncedAt: number
}

export function parseRepositorySlug(input: string): DevStudioRepoRef | null {
	const trimmed = input.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '')
	const match = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
	if (!match) {
		return null
	}

	return {
		owner: match[1],
		repo: match[2],
		branch: 'main',
	}
}

export function formatRepositorySlug(ref: DevStudioRepoRef): string {
	return `${ref.owner}/${ref.repo}`
}
