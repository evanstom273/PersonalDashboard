import { ArrowLeft, Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DocumentEditor } from '@/components/documents/DocumentEditor'
import { Button } from '@/components/ui/button'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { getDocument, createDocument, updateDocument } from '@/services/documents/documentService'
import type { DocumentContentFormat, DocumentRecord } from '@/storage/types'
import {
	documentContentToEditorHtml,
	editorHtmlToDocumentContent,
	isDocumentReadOnly,
} from '@/utils/documentContent'

const AUTOSAVE_MS = 800

export function DocumentEditorPage() {
	const { documentId } = useParams<{ documentId: string }>()
	const navigate = useNavigate()
	const { preferences } = usePreferencesContext()
	const [document, setDocument] = useState<DocumentRecord | null>(null)
	const [title, setTitle] = useState('')
	const [content, setContent] = useState('<p></p>')
	const [isLoading, setIsLoading] = useState(true)
	const saveTimerRef = useRef<number | null>(null)
	const latestRef = useRef({ title, content })
	const documentMetaRef = useRef<{
		id: string
		contentFormat: DocumentContentFormat
	} | null>(null)
	const lastPersistedRef = useRef({ title: '', content: '' })
	const readOnlyRef = useRef(false)

	useEffect(() => {
		latestRef.current = { title, content }
	}, [title, content])

	const readOnly = document ? isDocumentReadOnly(document) : false
	readOnlyRef.current = readOnly

	const persistDocument = useCallback(async () => {
		const meta = documentMetaRef.current
		if (!meta || readOnlyRef.current) {
			return
		}

		const snapshot = latestRef.current
		if (
			snapshot.title === lastPersistedRef.current.title &&
			snapshot.content === lastPersistedRef.current.content
		) {
			return
		}

		try {
			await updateDocument(meta.id, {
				title: snapshot.title,
				content: editorHtmlToDocumentContent(
					snapshot.content,
					meta.contentFormat,
				),
			})
			lastPersistedRef.current = { ...snapshot }
		} catch {
			// Save failures must not disrupt editing.
		}
	}, [])

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
				const editorHtml = documentContentToEditorHtml(stored)
				setDocument(stored)
				setTitle(stored.title)
				setContent(editorHtml)
				documentMetaRef.current = {
					id: stored.id,
					contentFormat: stored.contentFormat,
				}
				lastPersistedRef.current = {
					title: stored.title,
					content: editorHtml,
				}
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [documentId, navigate])

	useEffect(() => {
		if (!documentMetaRef.current || isLoading || readOnly) {
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
	}, [title, content, isLoading, readOnly, persistDocument])

	useEffect(() => {
		return () => {
			void persistDocument()
		}
	}, [persistDocument])

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
							Read-only
						</div>
					) : document.source === 'upload' ? (
						<span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
							Uploaded
						</span>
					) : null}
				</div>
			</header>

			<DocumentEditor
				content={content}
				onChange={setContent}
				editable={!readOnly}
				documentTitle={title}
				preferences={preferences}
			/>
		</div>
	)
}
