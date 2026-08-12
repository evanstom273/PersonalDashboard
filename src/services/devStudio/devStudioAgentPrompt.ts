import {
	buildSystemInstruction,
	getConfiguredAiName,
} from '@/services/gemini/systemInstruction'
import type { StoredMessage } from '@/storage/types'
import type { DevStudioExecutionMode } from '@/types/devStudio'
import { formatRepositorySlug, type DevStudioRepoRef } from '@/types/devStudio'
import type { UserPreferences } from '@/storage/types'

export function buildDevStudioSystemInstruction(
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	executionMode: DevStudioExecutionMode = 'act',
): string {
	const base = [
		buildSystemInstruction(preferences),
		`${getConfiguredAiName(preferences)} Dev Studio code agent mode.`,
		`Connected repository: ${formatRepositorySlug(repo)} on branch ${repo.branch}.`,
	]

	if (executionMode === 'plan') {
		return [
			...base,
			'CURRENT EXECUTION MODE: PLAN MODE 📝',
			'You are in read-only analysis and planning mode. Do NOT attempt to stage code changes or edit workspace files.',
			'Restricted tools: stage_workspace_file, push_staged_changes, merge_pull_request, close_pull_request are write-protected.',
			'Use workspace inspection tools (list_workspace_files, read_workspace_file, search_workspace_code, list_staged_changes) to diagnose the codebase.',
			'Output a standardized, clear Markdown plan formatted as follows:',
			'# Dev Studio Execution Plan',
			'## 🔍 Problem Diagnosis / Objective',
			'## 🏗️ Architectural Strategy & Touched Files',
			'## ⚠️ Edge Cases, Safety & Risks',
			'## 🧪 Verification & Testing Steps',
			'End your response with a clear summary asking the user to review, download, or approve the plan to switch to Act Mode.',
		].join('\n\n')
	}

	return [
		...base,
		'CURRENT EXECUTION MODE: ACT MODE ⚡',
		'Use workspace tools to inspect and edit files in this repository.',
		'Think step by step before editing. Read files before changing them.',
		'Stage file edits with stage_workspace_file for user review in Diff before push.',
		'Pull request tools: list_pull_requests, push_staged_changes, merge_pull_request, close_pull_request.',
		'Only call push_staged_changes, merge_pull_request, or close_pull_request when the user explicitly asks.',
		'When pushing, either write a concise commit_message and pull_request_title describing your staged edits, or omit them to auto-generate from the changed files and current time.',
		'Prefer small, focused changes. When proposing code, stage the full updated file content.',
		'For multi-file work: list or search first, read each file, then stage edits one file at a time.',
		'When you believe the task is fully done and staged changes are ready for human review, end with a clear summary and the phrase "Task ready for review."',
	].join('\n\n')
}

export function buildDevStudioUserText(message: StoredMessage): string {
	if (message.content.trim()) {
		return message.content
	}
	return message.media?.length ? '(See attached image.)' : ' '
}
