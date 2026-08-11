import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'
import { Loader2, Save, X } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { detectLanguagePath } from '@/utils/devStudioFileTree'
import { cn } from '@/utils/cn'

function buildLanguageExtension(path: string) {
	const language = detectLanguagePath(path)
	switch (language) {
		case 'typescript':
			return javascript({ typescript: true })
		case 'javascript':
			return javascript()
		case 'json':
			return json()
		case 'markdown':
			return markdown()
		case 'css':
			return css()
		case 'html':
			return html()
		default:
			return undefined
	}
}

export function DevStudioEditorPanel({ className }: { className?: string }) {
	const {
		openFile,
		updateOpenFileContent,
		stageOpenFile,
		closeOpenFile,
	} = useDevStudio()

	const extensions = useMemo(() => {
		if (!openFile?.path) {
			return []
		}
		const language = buildLanguageExtension(openFile.path)
		return language ? [language] : []
	}, [openFile?.path])

	if (!openFile) {
		return (
			<div
				className={cn(
					'flex h-full items-center justify-center px-6 py-10 text-center',
					className,
				)}
			>
				<div>
					<p className="text-sm font-medium">No file open</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Select a file from Files to edit in the IDE.
					</p>
				</div>
			</div>
		)
	}

	if (openFile.isLoading) {
		return (
			<div
				className={cn(
					'flex h-full items-center justify-center gap-2 text-sm text-muted-foreground',
					className,
				)}
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading {openFile.path}…
			</div>
		)
	}

	if (openFile.error) {
		return (
			<div
				className={cn(
					'flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center',
					className,
				)}
			>
				<p className="text-sm font-medium">Could not open file</p>
				<p className="text-sm text-destructive">{openFile.error}</p>
				<Button type="button" size="sm" variant="outline" onClick={closeOpenFile}>
					Close
				</Button>
			</div>
		)
	}

	return (
		<div className={cn('flex h-full min-h-0 flex-col', className)}>
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
				<div className="min-w-0">
					<p className="truncate font-mono text-xs">{openFile.path}</p>
					<p className="mt-0.5 text-[11px] text-muted-foreground">
						{openFile.isDirty ? 'Unsaved edits' : 'Synced from GitHub'}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void stageOpenFile()}
						disabled={!openFile.isDirty}
					>
						<Save className="h-4 w-4" />
						Stage
					</Button>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						onClick={closeOpenFile}
						aria-label="Close file"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden">
				<CodeMirror
					value={openFile.content}
					height="100%"
					theme={oneDark}
					extensions={extensions}
					onChange={(value) => updateOpenFileContent(value)}
					className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
					basicSetup={{
						lineNumbers: true,
						foldGutter: true,
						highlightActiveLine: true,
					}}
				/>
			</div>
		</div>
	)
}
