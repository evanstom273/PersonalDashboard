import { Loader2, X } from 'lucide-react'
import { useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import { ChatVoiceSession } from '@/components/chat/ChatVoiceSession'
import { useMobileNavLayout } from '@/hooks/useMobileNavLayout'
import { useAppSwipeNavigation } from '@/hooks/useAppSwipeNavigation'
import { useSwipePageTransition } from '@/hooks/useSwipePageTransition'
import { BottomNav } from '@/layout/BottomNav'
import { ScratchpadBusyIndicator, ScratchpadFab } from '@/components/scratchpad/ScratchpadFab'
import { ScratchpadPanel } from '@/components/scratchpad/ScratchpadPanel'
import {
	useChatGenerationContext,
	useChatHeaderSlot,
	useMainConversationContext,
	usePreferencesContext,
	useTextToSpeechContext,
} from '@/providers/ChatProvider'
import { formatAppVersionLabel } from '@/data/changelog'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { cn } from '@/utils/cn'

function getPageTitle(pathname: string, aiName: string): string {
	if (pathname === '/home' || pathname === '/') {
		return 'Home'
	}

	if (pathname === '/chat' || pathname === '/dev-studio') {
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
	const { isGenerating, completionNotice, clearCompletionNotice, stopGeneration, submitMessage } =
		useChatGenerationContext()
	const {
		status: speechStatus,
		speakAssistantMessage,
		stop: stopSpeech,
	} = useTextToSpeechContext()
	const location = useLocation()
	const navigate = useNavigate()
	const isMobileNav = useMobileNavLayout()
	const aiName = getConfiguredAiName(preferences)
	const isChatRoute = location.pathname === '/chat'
	const isDevStudioRoute = location.pathname === '/dev-studio'
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

	const handleVoiceSubmit = useCallback(
		async (payload: Parameters<typeof submitMessage>[0]) => {
			await submitMessage(payload)
		},
		[submitMessage],
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
							{isChatRoute || isDevStudioRoute ? (
								<p className="truncate text-xs text-muted-foreground">
									{formatAppVersionLabel()}
								</p>
							) : isGenerating ? (
								<p className="truncate text-xs text-muted-foreground">
									{aiName} is replying in the background…
								</p>
							) : null}
						</div>
						{isChatRoute || isDevStudioRoute ? (
							<div className="flex shrink-0 items-center gap-0.5">
								{chatHeaderVoiceSlot}
								{isChatRoute ? (
									<ChatConversationActions
										conversation={conversation}
										isGenerating={isGenerating}
										onClear={handleClearChat}
										onImport={handleImportChat}
									/>
								) : null}
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

			<ChatVoiceSession
				preferences={preferences}
				conversationMessages={conversation?.messages ?? []}
				isGenerating={isGenerating}
				hasApiKey={preferences.geminiApiKey.trim().length > 0}
				aiName={aiName}
				speechStatus={speechStatus}
				onSubmit={handleVoiceSubmit}
				onStopSpeech={stopSpeech}
				onSpeakAssistantMessage={speakAssistantMessage}
			/>

			<BottomNav />

			<ScratchpadFab />
			<ScratchpadBusyIndicator />
			<ScratchpadPanel />
		</div>
	)
}
