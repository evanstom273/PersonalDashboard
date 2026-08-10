import { Loader2, Menu, MessageSquare, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useEdgeSwipeToOpenDrawer } from '@/hooks/useEdgeSwipeToOpenDrawer'
import { useMobileNavLayout } from '@/hooks/useMobileNavLayout'
import { AppNav } from '@/layout/AppNav'
import {
	useChatGenerationContext,
	useMainConversationContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { getModelById } from '@/services/gemini/models'
import { cn } from '@/utils/cn'

function getMobileHeaderTitle(pathname: string, aiName: string): string {
	if (pathname === '/') {
		return aiName
	}

	if (pathname.startsWith('/library/documents/')) {
		return 'Document'
	}

	if (pathname.startsWith('/library')) {
		return 'Library'
	}

	if (pathname.startsWith('/memory')) {
		return 'Memory'
	}

	if (pathname.startsWith('/settings')) {
		return 'Settings'
	}

	return aiName
}

export function AppShell() {
	const { preferences } = usePreferencesContext()
	const { conversation, clearConversation, replaceConversation } =
		useMainConversationContext()
	const { isGenerating, completionNotice, clearCompletionNotice, stopGeneration } =
		useChatGenerationContext()
	const location = useLocation()
	const navigate = useNavigate()
	const isMobileNav = useMobileNavLayout()
	const [drawerOpen, setDrawerOpen] = useState(false)
	const aiName = getConfiguredAiName(preferences)
	const selectedModel = getModelById(preferences.defaultModelId)
	const isChatRoute = location.pathname === '/'
	const mobileHeaderTitle = getMobileHeaderTitle(location.pathname, aiName)

	const handleClearChat = useCallback(async () => {
		stopGeneration()
		await clearConversation()
	}, [clearConversation, stopGeneration])

	const handleImportChat = useCallback(
		async (imported: Parameters<typeof replaceConversation>[0]) => {
			await replaceConversation(imported)
		},
		[replaceConversation],
	)

	const openDrawer = useCallback(() => {
		setDrawerOpen(true)
	}, [])

	const goToChat = useCallback(() => {
		setDrawerOpen(false)
		clearCompletionNotice()

		if (!isChatRoute) {
			navigate('/')
		}
	}, [clearCompletionNotice, isChatRoute, navigate])

	useEdgeSwipeToOpenDrawer({
		enabled: isMobileNav && !drawerOpen,
		onOpen: openDrawer,
	})

	return (
		<div className="app-shell flex overflow-hidden bg-background">
			<aside className="hidden h-full w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex">
				<AppNav />
			</aside>

			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="left" className="p-0">
					<AppNav onNavigate={() => setDrawerOpen(false)} />
				</SheetContent>
			</Sheet>

			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<header className="relative z-[60] flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2.5 md:hidden">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setDrawerOpen((open) => !open)}
						aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={drawerOpen}
					>
						<Menu className="h-4 w-4" />
					</Button>

					<Button
						type="button"
						size="sm"
						variant={isChatRoute ? 'secondary' : 'default'}
						onClick={goToChat}
						className="shrink-0 gap-1.5"
						aria-label="Go to chat"
					>
						<MessageSquare className="h-4 w-4" />
						Chat
					</Button>

					<div className="min-w-0 flex-1 overflow-hidden">
						<div className="flex min-w-0 items-center gap-2 overflow-hidden">
							<p className="min-w-0 flex-1 truncate text-sm font-semibold">
								{mobileHeaderTitle}
							</p>
							{isChatRoute ? (
								<div className="shrink-0">
									<ChatConversationActions
										conversation={conversation}
										isGenerating={isGenerating}
										onClear={handleClearChat}
										onImport={handleImportChat}
									/>
								</div>
							) : null}
						</div>
						<p className="truncate text-xs text-muted-foreground">
							{isGenerating && !isChatRoute
								? `${aiName} is replying in the background…`
								: isChatRoute
									? (selectedModel?.name ?? 'Chat model')
									: 'Swipe from the left edge for the menu'}
						</p>
					</div>
				</header>

				{isMobileNav && !drawerOpen ? (
					<div
						className="pointer-events-none fixed top-0 left-0 z-[55] h-full w-2 md:hidden"
						aria-hidden
					/>
				) : null}

				{isGenerating && !isChatRoute ? (
					<div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm md:px-6">
						<span className="inline-flex items-center gap-2 text-primary">
							<Loader2 className="h-4 w-4 animate-spin" />
							{aiName} is replying…
						</span>
						<button
							type="button"
							onClick={goToChat}
							className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
						>
							View chat
						</button>
					</div>
				) : null}

				{completionNotice && !isChatRoute ? (
					<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-2 text-sm md:px-6">
						<span className="text-foreground">{completionNotice}</span>
						<div className="flex shrink-0 items-center gap-2">
							<button
								type="button"
								onClick={goToChat}
								className="text-xs font-medium text-primary underline-offset-4 hover:underline"
							>
								Open chat
							</button>
							<button
								type="button"
								onClick={clearCompletionNotice}
								className="rounded-md p-1 text-muted-foreground hover:text-foreground"
								aria-label="Dismiss"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					</div>
				) : null}

				<main
					className={cn(
						'flex min-h-0 flex-1 flex-col overflow-hidden',
						isMobileNav && 'touch-pan-y',
					)}
				>
					<Outlet />
				</main>
			</div>
		</div>
	)
}
