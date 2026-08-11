import { Loader2, X } from 'lucide-react'
import { useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import { useMobileNavLayout } from '@/hooks/useMobileNavLayout'
import { useAppSwipeNavigation } from '@/hooks/useAppSwipeNavigation'
import { useSwipePageTransition } from '@/hooks/useSwipePageTransition'
import { BottomNav } from '@/layout/BottomNav'
import {
	useChatGenerationContext,
	useChatHeaderSlot,
	useMainConversationContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'
import { formatAppVersionLabel } from '@/data/changelog'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { cn } from '@/utils/cn'

function getPageTitle(pathname: string, aiName: string): string {
	if (pathname === '/home' || pathname === '/') {
		return 'Home'
	}

	if (pathname === '/chat') {
		return aiName
	}

	if (pathname.startsWith('/library/projects/')) {
		return 'Project'
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
	const aiName = getConfiguredAiName(preferences)
	const isChatRoute = location.pathname === '/chat'
	const pageTitle = getPageTitle(location.pathname, aiName)
	const { navigateWithFade, contentClassName } = useSwipePageTransition()
	const { slot: chatHeaderVoiceSlot } = useChatHeaderSlot()
	const showAppHeader =
		!location.pathname.startsWith('/library/documents/') &&
		!location.pathname.startsWith('/library/projects/') &&
		location.pathname !== '/home' &&
		!(isChatRoute && !isMobileNav)

	useAppSwipeNavigation(navigateWithFade)

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

	const goToChat = useCallback(() => {
		clearCompletionNotice()

		if (!isChatRoute) {
			navigate('/chat')
		}
	}, [clearCompletionNotice, isChatRoute, navigate])

	return (
		<div className="app-shell flex flex-col overflow-hidden">
			{showAppHeader ? (
				<header className="app-header-glass relative z-40 shrink-0 px-4 py-3 md:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<div className="min-w-0 flex-1">
							<h1 className="truncate text-base font-semibold md:text-lg">
								{pageTitle}
							</h1>
							{isChatRoute ? (
								<p className="truncate text-xs text-muted-foreground">
									{formatAppVersionLabel()}
								</p>
							) : isGenerating && !isChatRoute ? (
								<p className="truncate text-xs text-muted-foreground">
									{aiName} is replying in the background…
								</p>
							) : null}
						</div>
						{isChatRoute ? (
							<div className="flex shrink-0 items-center gap-0.5">
								{chatHeaderVoiceSlot}
								<ChatConversationActions
									conversation={conversation}
									isGenerating={isGenerating}
									onClear={handleClearChat}
									onImport={handleImportChat}
								/>
							</div>
						) : null}
					</div>
				</header>
			) : null}

			{isGenerating && !isChatRoute ? (
				<div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm backdrop-blur-sm md:px-6">
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

			<main className={cn(contentClassName, 'touch-pan-y')}>
				<Outlet />
			</main>

			<BottomNav />
		</div>
	)
}
