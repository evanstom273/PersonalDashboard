import {
	Copy,
	Download,
	FilePlus2,
	FileText,
	Image,
	MoreHorizontal,
	Music,
	Pencil,
	Search,
	Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MediaLightbox } from '@/components/media/MediaLightbox'
import { useDocuments } from '@/hooks/useDocuments'
import { useLibraryMedia } from '@/hooks/useLibraryMedia'
import {
	deleteLibraryMediaItem,
	renameLibraryMediaItem,
} from '@/services/library/libraryMediaService'
import { updateDocument } from '@/services/documents/documentService'
import type { LibraryMediaKind, LibraryMediaRecord } from '@/storage/types'
import { formatTimestamp } from '@/utils/documentContent'
import {
	downloadDocument,
	downloadLibraryMediaItem,
} from '@/utils/downloads'
import { cn } from '@/utils/cn'

const LIBRARY_TABS = [
	{ id: 'documents', label: 'Documents', icon: FileText },
	{ id: 'images', label: 'Images', icon: Image },
	{ id: 'music', label: 'Music', icon: Music },
] as const

type LibraryTab = (typeof LIBRARY_TABS)[number]['id']

function isLibraryTab(value: string | null): value is LibraryTab {
	return LIBRARY_TABS.some((tab) => tab.id === value)
}

export function LibraryPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const tabParam = searchParams.get('tab')
	const activeTab: LibraryTab = isLibraryTab(tabParam) ? tabParam : 'documents'
	const [query, setQuery] = useState('')

	function setActiveTab(tab: LibraryTab): void {
		setSearchParams(tab === 'documents' ? {} : { tab })
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border px-4 py-4 md:px-6">
				<div>
					<h1 className="text-xl font-semibold md:text-2xl">Library</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Documents, images, and music from uploads and generation. Everything
						here can be downloaded.
					</p>
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					{LIBRARY_TABS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveTab(id)}
							className={cn(
								'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
								activeTab === id
									? 'border-primary/40 bg-primary/15 text-primary'
									: 'border-border bg-card text-muted-foreground hover:text-foreground',
							)}
						>
							<Icon className="h-4 w-4" />
							{label}
						</button>
					))}
				</div>

				<div className="relative mt-4 max-w-md">
					<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={`Search ${activeTab}…`}
						className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm outline-none ring-ring focus:ring-2"
					/>
				</div>
			</header>

			<ScrollArea className="min-h-0 flex-1">
				<div className="min-w-0 px-4 py-4 md:px-6">
					{activeTab === 'documents' ? (
						<DocumentsSection query={query} />
					) : (
						<MediaSection
							kind={activeTab === 'images' ? 'image' : 'audio'}
							query={query}
							emptyLabel={
								activeTab === 'images'
									? 'No images yet. Upload one with + in chat or generate an image.'
									: 'No music yet. Generate music in chat to save it here.'
							}
						/>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}

function DocumentsSection({ query }: { query: string }) {
	const navigate = useNavigate()
	const {
		documents,
		isLoading,
		refreshDocuments,
		createBlankDocument,
		removeDocument,
		copyDocument,
	} = useDocuments()
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
		navigate(`/library/documents/${document.id}`)
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
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => void handleCreate()}>
					<FilePlus2 className="h-4 w-4" />
					New document
				</Button>
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading documents…</p>
			) : filteredDocuments.length === 0 ? (
				<EmptyState
					message={
						query.trim()
							? 'No documents match your search.'
							: 'No documents yet. Create one or upload via + in chat.'
					}
				/>
			) : (
				<div className="space-y-2">
					{filteredDocuments.map((document) => (
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
										to={`/library/documents/${document.id}`}
										className="block truncate font-medium hover:underline"
									>
										{document.title}
									</Link>
								)}
								<p className="mt-1 text-xs text-muted-foreground">
									Created {formatTimestamp(document.createdAt)} · Modified{' '}
									{formatTimestamp(document.updatedAt)}
									{document.readOnly ? ' · Read-only upload' : ''}
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
										<Link to={`/library/documents/${document.id}`}>Open</Link>
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => downloadDocument(document, 'txt')}
									>
										<Download className="h-4 w-4" />
										Download TXT
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => downloadDocument(document, 'md')}
									>
										<Download className="h-4 w-4" />
										Download MD
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => downloadDocument(document, 'pdf')}
									>
										<Download className="h-4 w-4" />
										Download PDF
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
												navigate(`/library/documents/${copy.id}`)
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
					))}
				</div>
			)}
		</div>
	)
}

function MediaSection({
	kind,
	query,
	emptyLabel,
}: {
	kind: LibraryMediaKind
	query: string
	emptyLabel: string
}) {
	const { items, isLoading, refresh } = useLibraryMedia(kind)
	const [renamingId, setRenamingId] = useState<string | null>(null)
	const [renameValue, setRenameValue] = useState('')

	const filteredItems = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return items
		}
		return items.filter((item) => item.title.toLowerCase().includes(normalized))
	}, [items, query])

	async function handleRename(itemId: string): Promise<void> {
		const trimmed = renameValue.trim()
		if (!trimmed) {
			return
		}

		await renameLibraryMediaItem(itemId, trimmed)
		setRenamingId(null)
		setRenameValue('')
		await refresh()
	}

	return (
		<div className="space-y-3">
			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : filteredItems.length === 0 ? (
				<EmptyState message={query.trim() ? 'No items match your search.' : emptyLabel} />
			) : (
				filteredItems.map((item) => (
					<MediaCard
						key={item.id}
						item={item}
						isRenaming={renamingId === item.id}
						renameValue={renameValue}
						onRenameValueChange={setRenameValue}
						onStartRename={() => {
							setRenamingId(item.id)
							setRenameValue(item.title)
						}}
						onCancelRename={() => setRenamingId(null)}
						onConfirmRename={() => {
							void handleRename(item.id)
						}}
						onDelete={() => {
							if (window.confirm(`Delete "${item.title}" permanently?`)) {
								void deleteLibraryMediaItem(item.id)
							}
						}}
					/>
				))
			)}
		</div>
	)
}

function MediaCard({
	item,
	isRenaming,
	renameValue,
	onRenameValueChange,
	onStartRename,
	onCancelRename,
	onConfirmRename,
	onDelete,
}: {
	item: LibraryMediaRecord
	isRenaming: boolean
	renameValue: string
	onRenameValueChange: (value: string) => void
	onStartRename: () => void
	onCancelRename: () => void
	onConfirmRename: () => void
	onDelete: () => void
}) {
	return (
		<div className="min-w-0 rounded-xl border border-border bg-card p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					{isRenaming ? (
						<input
							autoFocus
							value={renameValue}
							onChange={(event) => onRenameValueChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									onConfirmRename()
								}
								if (event.key === 'Escape') {
									onCancelRename()
								}
							}}
							className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none"
						/>
					) : (
						<h3 className="truncate font-medium">{item.title}</h3>
					)}
					<p className="mt-1 text-xs text-muted-foreground">
						{item.source === 'upload' ? 'Uploaded' : 'Generated'} ·{' '}
						{formatTimestamp(item.createdAt)}
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() =>
							downloadLibraryMediaItem(item.title, item.mimeType, item.dataUrl)
						}
					>
						<Download className="h-4 w-4" />
						Download
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger
							hideChevron
							className="h-9 w-9 justify-center px-0"
							aria-label="Media actions"
						>
							<MoreHorizontal className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={onStartRename}>
								<Pencil className="h-4 w-4" />
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem className="text-destructive" onSelect={onDelete}>
								<Trash2 className="h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="mt-4 min-w-0 overflow-hidden">
				{item.kind === 'image' ? (
					<MediaLightbox
						src={item.dataUrl}
						alt={item.title}
						title={item.title}
					/>
				) : null}
				{item.kind === 'audio' ? (
					<audio controls src={item.dataUrl} className="w-full max-w-full" />
				) : null}
			</div>
		</div>
	)
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	)
}
