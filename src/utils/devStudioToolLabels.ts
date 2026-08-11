export function formatDevStudioToolLabel(
	toolName: string,
	args: Record<string, unknown> = {},
): string {
	switch (toolName) {
		case 'list_workspace_files': {
			const prefix =
				typeof args.path_prefix === 'string' ? args.path_prefix.trim() : ''
			return prefix ? `Listing files in ${prefix}` : 'Listing repository files'
		}
		case 'read_workspace_file': {
			const path = typeof args.path === 'string' ? args.path : 'file'
			return `Reading ${path}`
		}
		case 'search_workspace_code': {
			const query = typeof args.query === 'string' ? args.query : 'pattern'
			return `Searching for “${truncate(query, 48)}”`
		}
		case 'stage_workspace_file': {
			const path = typeof args.path === 'string' ? args.path : 'file'
			return `Staging changes to ${path}`
		}
		case 'list_staged_changes':
			return 'Checking staged changes'
		case 'list_pull_requests':
			return 'Listing open pull requests'
		case 'push_staged_changes':
			return 'Pushing branch and opening pull request'
		case 'merge_pull_request': {
			const number =
				typeof args.pull_number === 'number' ? args.pull_number : 'PR'
			return `Merging pull request #${number}`
		}
		case 'close_pull_request': {
			const number =
				typeof args.pull_number === 'number' ? args.pull_number : 'PR'
			return `Closing pull request #${number}`
		}
		default:
			return toolName.replaceAll('_', ' ')
	}
}

function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value
	}
	return `${value.slice(0, maxLength - 1)}…`
}
