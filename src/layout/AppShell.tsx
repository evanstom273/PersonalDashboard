import { Sidebar, TopNav } from '@/layout/Sidebar'
import { DashboardGrid } from '@/layout/DashboardGrid'
import { useDashboard } from '@/providers/DashboardProvider'
import { ScrollArea } from '@/components/ui/scroll-area'

export function AppShell() {
	const { addWidget } = useDashboard()

	return (
		<div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
			<Sidebar onAddWidget={addWidget} className="hidden md:flex" />
			<div className="flex min-w-0 flex-1 flex-col">
				<TopNav onAddWidget={addWidget} />
				<ScrollArea className="flex-1">
					<main className="p-4 md:p-6">
						<DashboardGrid />
					</main>
				</ScrollArea>
			</div>
		</div>
	)
}
