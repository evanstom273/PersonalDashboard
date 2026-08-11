import type { DevStudioFileNode } from '@/types/devStudio'

export function flattenFilePaths(nodes: DevStudioFileNode[]): string[] {
	const paths: string[] = []

	function walk(items: DevStudioFileNode[]): void {
		for (const node of items) {
			if (node.type === 'file') {
				paths.push(node.path)
			} else if (node.children) {
				walk(node.children)
			}
		}
	}

	walk(nodes)
	return paths
}

export function filterFilePaths(paths: string[], pathPrefix?: string): string[] {
	const prefix = pathPrefix?.trim().replace(/^\.\//, '')
	if (!prefix) {
		return paths
	}
	return paths.filter((path) => path.startsWith(prefix))
}

export function detectLanguagePath(path: string): string {
	const lower = path.toLowerCase()
	if (lower.endsWith('.tsx') || lower.endsWith('.ts')) {
		return 'typescript'
	}
	if (lower.endsWith('.jsx') || lower.endsWith('.js') || lower.endsWith('.mjs')) {
		return 'javascript'
	}
	if (lower.endsWith('.json')) {
		return 'json'
	}
	if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
		return 'markdown'
	}
	if (lower.endsWith('.css')) {
		return 'css'
	}
	if (lower.endsWith('.html') || lower.endsWith('.htm')) {
		return 'html'
	}
	return 'text'
}
