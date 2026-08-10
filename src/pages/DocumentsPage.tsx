import {
	Copy,
	FilePlus2,
	MoreHorizontal,
	Pencil,
	Search,
	Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDocuments } from '@/hooks/useDocuments'
import { updateDocument } from '@/services/documents/documentService'
import { formatTimestamp } from '@/utils/documentContent'

export function DocumentsPage() {
	const navigate = useNavigate()
	const {
		documents,
		isLoading,
		refreshDocuments,
		createBlankDocument,
		removeDocument,
		copyDocument,
	} = useDocuments()
	const [query, setQuery] = useState('')
	const [renamingId, setRenamingId] = useState<string | null>(null)
	const [renameValue, setRenameValue] = useState('')

	const filteredDocuments = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return documents
		}
		return documents.filter((document) =>
			document.title.toLowerCase().includes(normalized),
		)
	}, [documents, query])

	async function handleCreate(): Promise<void> {
		const document = await createBlankDocument()
		navigate(`/documents/${document.id}`)
	}

	async function handleRename(documentId: string): Promise<void> {
		const trimmed = renameValue.trim()
		if (!trimmed) {
			return
		}

		await updateDocument(documentId, { title: trimmed })
		setRenamingId(null)
		setRenameValue('')
		await refreshDocuments()
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border px-4 py-4 md:px-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-xl font-semibold md:text-2xl">Documents</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Shared documents for you and your assistant. AI-created and
							manual documents live in the same library.
						</p>
					</div>
					<Button onClick={() => void handleCreate()}>
						<FilePlus2 className="h-4 w-4" />
						New document
					</Button>
				</div>

				<div className="relative mt-4 max-w-md">
					<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search documents by title…"
						className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm outline-none ring-ring focus:ring-2"
					/>
				</div>
			</header>

			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-2 px-4 py-4 md:px-6">
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading documents…</p>
					) : filteredDocuments.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
							<p className="text-sm text-muted-foreground">
								{query.trim()
									? 'No documents match your search.'
									: 'No documents yet. Create one manually or ask your assistant to create one in chat.'}
							</p>
						</div>
					) : (
						filteredDocuments.map((document) => (
							<div
								key={document.id}
								className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
							>
								<div className="min-w-0 flex-1">
									{renamingId === document.id ? (
										<input
											autoFocus
											value={renameValue}
											onChange={(event) => setRenameValue(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter') {
													void handleRename(document.id)
												}
												if (event.key === 'Escape') {
													setRenamingId(null)
												}
											}}
											className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none"
										/>
									) : (
										<Link
											to={`/documents/${document.id}`}
											className="block truncate font-medium hover:underline"
										>
											{document.title}
										</Link>
									)}
									<p className="mt-1 text-xs text-muted-foreground">
										Created {formatTimestamp(document.createdAt)} · Modified{' '}
										{formatTimestamp(document.updatedAt)}
									</p>
								</div>

								<DropdownMenu>
									<DropdownMenuTrigger
										hideChevron
										className="h-9 w-9 justify-center px-0"
										aria-label="Document actions"
									>
										<MoreHorizontal className="h-4 w-4" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem asChild>
											<Link to={`/documents/${document.id}`}>Open</Link>
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => {
												setRenamingId(document.id)
												setRenameValue(document.title)
											}}
										>
											<Pencil className="h-4 w-4" />
											Rename
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => {
												void copyDocument(document.id).then((copy) => {
													navigate(`/documents/${copy.id}`)
												})
											}}
										>
											<Copy className="h-4 w-4" />
											Duplicate
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive"
											onSelect={() => {
												if (
													window.confirm(
														`Delete "${document.title}" permanently?`,
													)
												) {
													void removeDocument(document.id)
												}
											}}
										>
											<Trash2 className="h-4 w-4" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
