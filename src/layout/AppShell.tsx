import { Menu } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AppNav } from '@/layout/AppNav'
import {
	useChatUiContext,
	useMainConversationContext,
	usePreferencesContext,
} from '@/providers/ChatProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { getModelById } from '@/services/gemini/models'

export function AppShell() {
	const { preferences } = usePreferencesContext()
	const { conversation, clearConversation, replaceConversation } =
		useMainConversationContext()
	const { isChatGenerating } = useChatUiContext()
	const location = useLocation()
	const [drawerOpen, setDrawerOpen] = useState(false)
	const aiName = getConfiguredAiName(preferences)
	const selectedModel = getModelById(preferences.defaultModelId)
	const isChatRoute = location.pathname === '/'

	const handleClearChat = useCallback(async () => {
		await clearConversation()
	}, [clearConversation])

	const handleImportChat = useCallback(
		async (imported: Parameters<typeof replaceConversation>[0]) => {
			await replaceConversation(imported)
		},
		[replaceConversation],
	)

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
				<header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5 md:hidden">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open menu"
					>
						<Menu className="h-4 w-4" />
					</Button>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="truncate text-sm font-semibold">{aiName}</p>
							{isChatRoute ? (
								<ChatConversationActions
									conversation={conversation}
									isGenerating={isChatGenerating}
									onClear={handleClearChat}
									onImport={handleImportChat}
								/>
							) : null}
						</div>
						<p className="text-xs text-muted-foreground">
							{selectedModel?.name ?? 'Chat model'}
						</p>
					</div>
				</header>

				<main className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
