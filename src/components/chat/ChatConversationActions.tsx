import { Download, Ellipsis, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	downloadChatExport,
	isChatExportZipFileName,
	parseChatImportFile,
	parseChatImportZip,
} from '@/utils/chatExport'
import type { ConversationRecord } from '@/storage/types'

interface ChatConversationActionsProps {
	conversation: ConversationRecord | null
	isGenerating?: boolean
	onClear: () => Promise<void>
	onImport: (conversation: ConversationRecord) => Promise<void>
}

export function ChatConversationActions({
	conversation,
	isGenerating = false,
	onClear,
	onImport,
}: ChatConversationActionsProps) {
	const importInputRef = useRef<HTMLInputElement>(null)
	const [clearDialogOpen, setClearDialogOpen] = useState(false)
	const [importDialogOpen, setImportDialogOpen] = useState(false)
	const [pendingImport, setPendingImport] = useState<ConversationRecord | null>(
		null,
	)
	const [importError, setImportError] = useState<string | null>(null)
	const [isWorking, setIsWorking] = useState(false)

	const messageCount = conversation?.messages.length ?? 0

	async function handleClear(): Promise<void> {
		setIsWorking(true)
		try {
			await onClear()
			setClearDialogOpen(false)
		} finally {
			setIsWorking(false)
		}
	}

	async function handleImportConfirm(): Promise<void> {
		if (!pendingImport) {
			return
		}

		setIsWorking(true)
		try {
			await onImport(pendingImport)
			setPendingImport(null)
			setImportDialogOpen(false)
		} finally {
			setIsWorking(false)
		}
	}

	function handleImportFileChange(event: ChangeEvent<HTMLInputElement>): void {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) {
			return
		}

		setImportError(null)

		if (isChatExportZipFileName(file.name)) {
			const reader = new FileReader()
			reader.onload = () => {
				try {
					const bytes = new Uint8Array(reader.result as ArrayBuffer)
					const imported = parseChatImportZip(bytes)
					setPendingImport(imported)
					setImportDialogOpen(true)
				} catch (error) {
					setImportError(
						error instanceof Error ? error.message : 'Could not read that chat file.',
					)
				}
			}
			reader.onerror = () => {
				setImportError('Could not read that chat file.')
			}
			reader.readAsArrayBuffer(file)
			return
		}

		const reader = new FileReader()
		reader.onload = () => {
			try {
				const raw = JSON.parse(String(reader.result))
				const imported = parseChatImportFile(raw)
				setPendingImport(imported)
				setImportDialogOpen(true)
			} catch (error) {
				setImportError(
					error instanceof Error ? error.message : 'Could not read that chat file.',
				)
			}
		}
		reader.onerror = () => {
			setImportError('Could not read that chat file.')
		}
		reader.readAsText(file)
	}

	return (
		<>
			<input
				ref={importInputRef}
				type="file"
				accept="application/json,.json,application/zip,.zip"
				className="hidden"
				onChange={handleImportFileChange}
			/>

			<DropdownMenu>
				<DropdownMenuTrigger asChild hideChevron>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0"
						disabled={isGenerating}
						aria-label="Chat options"
						title="Chat options"
					>
						<Ellipsis className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						className="gap-2"
						disabled={isGenerating}
						onSelect={() => importInputRef.current?.click()}
					>
						<Upload className="h-4 w-4" />
						Import chat
					</DropdownMenuItem>
					<DropdownMenuItem
						className="gap-2"
						disabled={!conversation || isGenerating}
						onSelect={() => {
							if (conversation) {
								downloadChatExport(conversation)
							}
						}}
					>
						<Download className="h-4 w-4" />
						Export chat
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="gap-2 text-destructive focus:text-destructive"
						disabled={messageCount === 0 || isGenerating}
						onSelect={() => setClearDialogOpen(true)}
					>
						<Trash2 className="h-4 w-4" />
						Delete chat
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{importError ? (
				<Dialog open onOpenChange={() => setImportError(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Could not import chat</DialogTitle>
							<DialogDescription>{importError}</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button onClick={() => setImportError(null)}>OK</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : null}

			<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear this conversation?</DialogTitle>
						<DialogDescription>
							This permanently deletes all {messageCount} message
							{messageCount === 1 ? '' : 's'} in your continuous chat.
							Documents and library items are not affected.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							disabled={isWorking}
							onClick={() => {
								void handleClear()
							}}
						>
							{isWorking ? 'Clearing…' : 'Clear chat'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={importDialogOpen}
				onOpenChange={(open) => {
					setImportDialogOpen(open)
					if (!open) {
						setPendingImport(null)
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Replace current chat?</DialogTitle>
						<DialogDescription>
							Importing replaces your current {messageCount} message
							{messageCount === 1 ? '' : 's'} with{' '}
							{pendingImport?.messages.length ?? 0} imported message
							{(pendingImport?.messages.length ?? 0) === 1 ? '' : 's'}. This
							cannot be undone unless you exported a backup first.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							disabled={isWorking || !pendingImport}
							onClick={() => {
								void handleImportConfirm()
							}}
						>
							{isWorking ? 'Importing…' : 'Replace chat'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
