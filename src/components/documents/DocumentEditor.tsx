import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
	Bold,
	Heading2,
	Italic,
	Link2,
	List,
	ListOrdered,
	Quote,
	Redo,
	Undo,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface DocumentEditorProps {
	content: string
	onChange: (html: string) => void
	editable?: boolean
	placeholder?: string
	className?: string
}

export function DocumentEditor({
	content,
	onChange,
	editable = true,
	placeholder = 'Start writing…',
	className,
}: DocumentEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: 'text-primary underline underline-offset-4',
				},
			}),
			Placeholder.configure({ placeholder }),
		],
		content,
		editable,
		onUpdate: ({ editor: currentEditor }) => {
			onChange(currentEditor.getHTML())
		},
		editorProps: {
			attributes: {
				class:
					'document-editor-content min-h-[50vh] px-4 py-4 focus:outline-none md:px-6',
			},
		},
	})

	useEffect(() => {
		if (!editor) {
			return
		}

		const current = editor.getHTML()
		if (content !== current) {
			editor.commands.setContent(content, { emitUpdate: false })
		}
	}, [content, editor])

	if (!editor) {
		return null
	}

	return (
		<div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
			{editable ? (
				<div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-card/40 px-2 py-2 md:px-4">
				<ToolbarButton
					label="Bold"
					active={editor.isActive('bold')}
					onClick={() => editor.chain().focus().toggleBold().run()}
				>
					<Bold className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Italic"
					active={editor.isActive('italic')}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Heading"
					active={editor.isActive('heading', { level: 2 })}
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				>
					<Heading2 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Bullet list"
					active={editor.isActive('bulletList')}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				>
					<List className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Numbered list"
					active={editor.isActive('orderedList')}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				>
					<ListOrdered className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Block quote"
					active={editor.isActive('blockquote')}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
				>
					<Quote className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Link"
					active={editor.isActive('link')}
					onClick={() => {
						const previous = editor.getAttributes('link').href as string | undefined
						const url = window.prompt('Enter URL', previous ?? 'https://')
						if (url === null) {
							return
						}
						if (url === '') {
							editor.chain().focus().extendMarkRange('link').unsetLink().run()
							return
						}
						editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
					}}
				>
					<Link2 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Undo"
					onClick={() => editor.chain().focus().undo().run()}
				>
					<Undo className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Redo"
					onClick={() => editor.chain().focus().redo().run()}
				>
					<Redo className="h-4 w-4" />
				</ToolbarButton>
			</div>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto">
				<EditorContent editor={editor} className="h-full" />
			</div>
		</div>
	)
}

function ToolbarButton({
	label,
	active,
	onClick,
	children,
}: {
	label: string
	active?: boolean
	onClick: () => void
	children: ReactNode
}) {
	return (
		<Button
			type="button"
			size="icon"
			variant={active ? 'secondary' : 'ghost'}
			onClick={onClick}
			aria-label={label}
			className="h-8 w-8"
		>
			{children}
		</Button>
	)
}
