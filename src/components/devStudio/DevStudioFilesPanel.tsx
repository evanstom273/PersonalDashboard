import { ChevronRight, File, Folder } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDevStudio } from '@/providers/DevStudioProvider'
import type { DevStudioFileNode } from '@/types/devStudio'
import { cn } from '@/utils/cn'

export function DevStudioFilesPanel() {
	const {
		workspace,
		connectionStatus,
		selectedFilePath,
		setSelectedFilePath,
	} = useDevStudio()

	if (connectionStatus === 'connecting') {
		return (
			<PanelPlaceholder
				title="Loading files…"
				description="Fetching repository tree from GitHub."
			/>
		)
	}

	if (!workspace) {
		return (
			<PanelPlaceholder
				title="No workspace loaded"
				description="Connect a repository to browse files here."
			/>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="shrink-0 border-b border-border/60 px-4 py-2">
				<p className="text-xs text-muted-foreground">
					{workspace.tree.length} top-level entries · synced{' '}
					{new Date(workspace.lastSyncedAt).toLocaleTimeString()}
				</p>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
				<FileTree
					nodes={workspace.tree}
					selectedFilePath={selectedFilePath}
					onSelectFile={setSelectedFilePath}
				/>
			</div>
			{selectedFilePath ? (
				<div className="shrink-0 border-t border-border/60 px-4 py-3">
					<p className="text-xs font-medium text-muted-foreground">Selected</p>
					<p className="mt-1 truncate font-mono text-xs">{selectedFilePath}</p>
					<p className="mt-2 text-xs text-muted-foreground">
						File preview and agent read tools come next.
					</p>
				</div>
			) : null}
		</div>
	)
}

function FileTree({
	nodes,
	selectedFilePath,
	onSelectFile,
	depth = 0,
}: {
	nodes: DevStudioFileNode[]
	selectedFilePath: string | null
	onSelectFile: (path: string) => void
	depth?: number
}) {
	return (
		<ul className="space-y-0.5">
			{nodes.map((node) => (
				<FileTreeNode
					key={node.path}
					node={node}
					depth={depth}
					selectedFilePath={selectedFilePath}
					onSelectFile={onSelectFile}
				/>
			))}
		</ul>
	)
}

function FileTreeNode({
	node,
	depth,
	selectedFilePath,
	onSelectFile,
}: {
	node: DevStudioFileNode
	depth: number
	selectedFilePath: string | null
	onSelectFile: (path: string) => void
}) {
	const [isOpen, setIsOpen] = useState(depth < 1)
	const isDir = node.type === 'dir'
	const isSelected = !isDir && selectedFilePath === node.path
	const fileName = useMemo(
		() => node.path.split('/').pop() ?? node.path,
		[node.path],
	)

	if (isDir) {
		return (
			<li>
				<button
					type="button"
					onClick={() => setIsOpen((open) => !open)}
					className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
					style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
				>
					<ChevronRight
						className={cn(
							'h-3.5 w-3.5 shrink-0 transition-transform',
							isOpen && 'rotate-90',
						)}
					/>
					<Folder className="h-3.5 w-3.5 shrink-0 text-primary/80" />
					<span className="truncate">{fileName}</span>
				</button>
				{isOpen && node.children ? (
					<FileTree
						nodes={node.children}
						selectedFilePath={selectedFilePath}
						onSelectFile={onSelectFile}
						depth={depth + 1}
					/>
				) : null}
			</li>
		)
	}

	return (
		<li>
			<button
				type="button"
				onClick={() => onSelectFile(node.path)}
				className={cn(
					'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
					isSelected && 'bg-primary/10 text-primary',
				)}
				style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}
			>
				<File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<span className="truncate">{fileName}</span>
			</button>
		</li>
	)
}

function PanelPlaceholder({
	title,
	description,
}: {
	title: string
	description: string
}) {
	return (
		<div className="flex h-full items-center justify-center px-6 py-10 text-center">
			<div>
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	)
}
