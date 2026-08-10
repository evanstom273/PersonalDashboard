import { ArrowLeft, Lock, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DocumentEditor } from '@/components/documents/DocumentEditor'
import { Button } from '@/components/ui/button'
import { getDocument, createDocument, updateDocument } from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'
import {
	documentContentToEditorHtml,
	editorHtmlToDocumentContent,
	formatTimestamp,
	isDocumentReadOnly,
} from '@/utils/documentContent'

const AUTOSAVE_MS = 800

export function DocumentEditorPage() {
	const { documentId } = useParams<{ documentId: string }>()
	const navigate = useNavigate()
	const [document, setDocument] = useState<DocumentRecord | null>(null)
	const [title, setTitle] = useState('')
	const [content, setContent] = useState('<p></p>')
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const latestRef = useRef({ title, content })

	useEffect(() => {
		latestRef.current = { title, content }
	}, [title, content])

	const readOnly = document ? isDocumentReadOnly(document) : false

	const persistDocument = useCallback(async () => {
		if (!document || readOnly) {
			return
		}

		setIsSaving(true)
		try {
			const updated = await updateDocument(document.id, {
				title: latestRef.current.title,
				content: editorHtmlToDocumentContent(
					latestRef.current.content,
					document.contentFormat,
				),
			})
			setDocument(updated)
			setLastSavedAt(updated.updatedAt)
		} finally {
			setIsSaving(false)
		}
	}, [document, readOnly])

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			if (!documentId) {
				return
			}

			if (documentId === 'new') {
				const created = await createDocument('Untitled document', '', {
					source: 'user',
					contentFormat: 'markdown',
					readOnly: false,
				})
				if (!cancelled) {
					navigate(`/library/documents/${created.id}`, { replace: true })
				}
				return
			}

			const stored = await getDocument(documentId)
			if (!cancelled) {
				if (!stored) {
					navigate('/library', { replace: true })
					return
				}
				setDocument(stored)
				setTitle(stored.title)
				setContent(documentContentToEditorHtml(stored))
				setLastSavedAt(stored.updatedAt)
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [documentId, navigate])

	useEffect(() => {
		if (!document || isLoading || readOnly) {
			return
		}

		if (saveTimerRef.current) {
			window.clearTimeout(saveTimerRef.current)
		}

		saveTimerRef.current = window.setTimeout(() => {
			void persistDocument()
		}, AUTOSAVE_MS)

		return () => {
			if (saveTimerRef.current) {
				window.clearTimeout(saveTimerRef.current)
			}
		}
	}, [title, content, document, isLoading, readOnly, persistDocument])

	if (isLoading || !document) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Loading document…
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border px-4 py-3 md:px-6">
				<div className="flex flex-wrap items-center gap-3">
					<Button asChild variant="ghost" size="sm">
						<Link to="/library">
							<ArrowLeft className="h-4 w-4" />
							Library
						</Link>
					</Button>
					<input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						readOnly={readOnly}
						className="min-w-[12rem] flex-1 bg-transparent text-lg font-semibold outline-none read-only:cursor-default read-only:opacity-80"
						placeholder="Document title"
					/>
					{readOnly ? (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Lock className="h-3.5 w-3.5" />
							Read-only upload
						</div>
					) : (
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Save className="h-3.5 w-3.5" />
							{isSaving
								? 'Saving…'
								: lastSavedAt
									? `Saved ${formatTimestamp(lastSavedAt)}`
									: 'Not saved yet'}
						</div>
					)}
				</div>
			</header>

			<DocumentEditor
				content={content}
				onChange={setContent}
				editable={!readOnly}
			/>
		</div>
	)
}
