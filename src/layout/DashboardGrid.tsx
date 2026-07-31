import { Loader2, X } from 'lucide-react'
import { useCallback } from 'react'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { Button } from '@/components/ui/button'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { cn } from '@/utils/cn'
import type { DashboardLayouts } from '@/types/widget'
import { WidgetHost } from '@/widgets/WidgetHost'
import { getWidgetDefinition } from '@/widgets/registry'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }

export function DashboardGrid() {
	const {
		instances,
		layouts,
		onLayoutChange,
		removeWidget,
		isLoading,
	} = useDashboardLayout()

	const handleLayoutChange = useCallback(
		(_currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
			onLayoutChange(_currentLayout, allLayouts as DashboardLayouts)
		},
		[onLayoutChange],
	)

	if (isLoading) {
		return (
			<div className="flex min-h-[12rem] items-center justify-center">
				<Loader2 className="size-6 animate-spin text-primary" />
			</div>
		)
	}

	if (instances.length === 0) {
		return (
			<div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 text-center">
				<p className="text-sm font-medium text-foreground">No widgets yet</p>
				<p className="max-w-sm text-sm text-muted-foreground">
					Add a widget from the sidebar or the top navigation bar to start building your dashboard.
				</p>
			</div>
		)
	}

	return (
		<div className="dashboard-grid w-full">
			<ResponsiveGridLayout
				className="layout"
				layouts={layouts}
				breakpoints={BREAKPOINTS}
				cols={COLS}
				rowHeight={44}
				margin={[12, 12]}
				containerPadding={[0, 0]}
				draggableHandle=".widget-drag-handle"
				onLayoutChange={handleLayoutChange}
				compactType="vertical"
			>
				{instances.map((instance) => {
					const definition = getWidgetDefinition(instance.type)
					return (
						<div key={instance.id} className={cn('relative')}>
							<Button
								variant="ghost"
								size="icon"
								className="absolute right-1.5 top-1.5 z-10 size-7 border border-border/60 bg-background/90 text-muted-foreground hover:border-primary/40 hover:text-primary"
								onClick={() => removeWidget(instance.id)}
								aria-label={`Remove ${definition?.name ?? instance.type} widget`}
							>
								<X className="size-3.5" />
							</Button>
							<WidgetHost instanceId={instance.id} type={instance.type} />
						</div>
					)
				})}
			</ResponsiveGridLayout>
		</div>
	)
}
