import { Sidebar } from '@/layout/Sidebar'
import { TopNav } from '@/layout/TopNav'
import { DashboardGrid } from '@/layout/DashboardGrid'
import { useDashboard } from '@/providers/DashboardProvider'

export function AppShell() {
	const { addWidget } = useDashboard()

	return (
		<div className="shell flex h-dvh max-h-dvh w-full overflow-hidden bg-background text-foreground">
			<Sidebar onAddWidget={addWidget} className="hidden lg:flex" />
			<Sidebar onAddWidget={addWidget} iconOnly className="hidden md:flex lg:hidden" />
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<TopNav onAddWidget={addWidget} />
				<main className="main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
					<div className="px-3 py-3 md:px-5 md:py-4">
						<DashboardGrid />
					</div>
				</main>
			</div>
		</div>
	)
}
