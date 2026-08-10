import { Check, Copy } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface ChatMarkdownProps {
	content: string
	className?: string
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
	return (
		<div className={cn('chat-markdown', className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
					a: ({ href, children }) => (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary underline underline-offset-4"
						>
							{children}
						</a>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	)
}

function CodeBlock({ children }: { children: ReactNode }) {
	const [copied, setCopied] = useState(false)
	const codeElement = findCodeElement(children)
	const language = extractLanguage(codeElement?.props?.className)
	const codeText = extractCodeText(codeElement)

	const handleCopy = useCallback(async () => {
		if (!codeText) {
			return
		}

		try {
			await navigator.clipboard.writeText(codeText)
			setCopied(true)
			window.setTimeout(() => setCopied(false), 2000)
		} catch {
			// Clipboard access can fail in insecure contexts.
		}
	}, [codeText])

	return (
		<div className="chat-code-block">
			<div className="chat-code-block-header">
				<span>{language || 'code'}</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
					onClick={() => {
						void handleCopy()
					}}
					disabled={!codeText}
				>
					{copied ? (
						<Check className="h-3.5 w-3.5" />
					) : (
						<Copy className="h-3.5 w-3.5" />
					)}
					{copied ? 'Copied' : 'Copy'}
				</Button>
			</div>
			<pre>{children}</pre>
		</div>
	)
}

function findCodeElement(node: ReactNode): CodeElementLike | null {
	if (!node || typeof node !== 'object' || !('props' in node)) {
		return null
	}

	const element = node as CodeElementLike
	if (element.type === 'code') {
		return element
	}

	const child = element.props?.children
	if (Array.isArray(child)) {
		for (const item of child) {
			const match = findCodeElement(item)
			if (match) {
				return match
			}
		}
	}

	return findCodeElement(child ?? null)
}

interface CodeElementLike {
	type?: string
	props?: {
		className?: string
		children?: ReactNode
	}
}

function extractLanguage(className?: string): string | null {
	if (!className) {
		return null
	}

	const match = className.match(/language-([\w-]+)/)
	return match?.[1] ?? null
}

function extractCodeText(node: CodeElementLike | null): string {
	if (!node?.props?.children) {
		return ''
	}

	const { children } = node.props
	if (typeof children === 'string') {
		return children
	}

	if (Array.isArray(children)) {
		return children.map((child) => extractCodeText(findCodeElement(child))).join('')
	}

	return ''
}
