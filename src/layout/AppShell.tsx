import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AppNav } from '@/layout/AppNav'
import { usePreferencesContext } from '@/providers/ChatProvider'

export function AppShell() {
	const { preferences } = usePreferencesContext()
	const [drawerOpen, setDrawerOpen] = useState(false)

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<aside className="hidden h-full w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex">
				<AppNav />
			</aside>

			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="left" className="p-0">
					<AppNav onNavigate={() => setDrawerOpen(false)} />
				</SheetContent>
			</Sheet>

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open menu"
					>
						<Menu className="h-4 w-4" />
					</Button>
					<div>
						<p className="text-sm font-semibold">Gemini Chat</p>
						<p className="text-xs text-muted-foreground">
							{preferences.defaultModelId === 'gemini-3.1-pro-preview'
								? 'Gemini 3.1 Pro'
								: 'Gemini 3.6 Flash'}
						</p>
					</div>
				</header>

				<main className="flex min-h-0 flex-1 flex-col">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
