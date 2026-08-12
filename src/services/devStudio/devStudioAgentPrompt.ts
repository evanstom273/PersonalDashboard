import {
	getConfiguredAiName,
	getConfiguredUserName,
} from '@/services/gemini/systemInstruction'
import { isGemmaDevStudioModel } from '@/services/devStudio/devStudioModels'
import type { StoredMessage } from '@/storage/types'
import type { DevStudioExecutionMode } from '@/types/devStudio'
import { formatRepositorySlug, type DevStudioRepoRef } from '@/types/devStudio'
import type { UserPreferences } from '@/storage/types'

const EFFICIENCY_GUIDANCE = [
	'DEV STUDIO EFFICIENCY (always follow):',
	'Search or list files before reading — load only paths you will edit.',
	'For large files use read_workspace_file start_line/end_line to read a section at a time.',
	'Avoid re-reading the same file; use prior tool output when the SHA has not changed.',
	'Prefer one purposeful tool call over exploratory chains. Stage one file at a time.',
	'Keep replies concise; put detail in staged file content, not long chat prose.',
].join('\n')

const GEMMA_EXTRA_GUIDANCE = [
	'QUOTA MODE (Gemma — 16k input tokens/minute):',
	'One tool call per turn when possible. Never read a whole large file — use line ranges or search.',
	'DevStudioProvider.tsx and similar files: search first, then read_line ranges of ~80 lines.',
].join('\n')

function buildDevStudioCompactBase(
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	strictQuota: boolean,
): string {
	const aiName = getConfiguredAiName(preferences)
	const userName = getConfiguredUserName(preferences)
	const behavior = preferences.aiBehaviorInstructions.trim()

	const lines = [
		`You are ${aiName}, Dev Studio code agent for ${userName}.`,
		`Repository: ${formatRepositorySlug(repo)} @ branch ${repo.branch}.`,
	]

	if (behavior && !strictQuota) {
		lines.push(`Style: ${behavior.slice(0, 400)}`)
	}

	return lines.join('\n')
}

export function buildDevStudioSystemInstruction(
	preferences: UserPreferences,
	repo: DevStudioRepoRef,
	executionMode: DevStudioExecutionMode = 'act',
	modelId?: string,
): string {
	const strictQuota = modelId ? isGemmaDevStudioModel(modelId) : false

	const base = [
		buildDevStudioCompactBase(preferences, repo, strictQuota),
		EFFICIENCY_GUIDANCE,
		strictQuota ? GEMMA_EXTRA_GUIDANCE : '',
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
		]
			.filter(Boolean)
			.join('\n\n')
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
	]
		.filter(Boolean)
		.join('\n\n')
}

export function buildDevStudioUserText(message: StoredMessage): string {
	if (message.content.trim()) {
		return message.content
	}
	return message.media?.length ? '(See attached image.)' : ' '
}
