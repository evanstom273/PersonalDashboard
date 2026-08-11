export function isWorkflowFilePath(path: string): boolean {
	const normalized = path.trim().replace(/\\/g, '/')
	return normalized.startsWith('.github/workflows/')
}

export function getWorkflowFilePaths(paths: string[]): string[] {
	return paths.filter(isWorkflowFilePath)
}

export function stagedChangesNeedWorkflowsPermission(paths: string[]): boolean {
	return getWorkflowFilePaths(paths).length > 0
}
