import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { Button } from '@/components/ui/button'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { useEditMode } from '@/providers/EditModeProvider'
import { cn } from '@/utils/cn'
import { filterLayoutsByInstances, getVisibleInstances } from '@/utils/layout'
import type { DashboardLayouts } from '@/types/widget'
import { WidgetHost } from '@/widgets/WidgetHost'
import { getWidgetDefinition } from '@/widgets/registry'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
const ROW_HEIGHT = 36

export function DashboardGrid() {
	const { isEditMode } = useEditMode()
	const {
		instances,
		layouts,
		onLayoutChange,
		removeWidget,
		setWidgetHidden,
		isLoading,
	} = useDashboardLayout()

	const displayInstances = useMemo(
		() => getVisibleInstances(instances, isEditMode),
		[instances, isEditMode],
	)

	const displayLayouts = useMemo(
		() => filterLayoutsByInstances(layouts, displayInstances),
		[layouts, displayInstances],
	)

	const handleLayoutChange = useCallback(
		(_currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
			if (!isEditMode) {
				return
			}

			const hiddenIds = new Set(
				instances.filter((instance) => instance.hidden).map((instance) => instance.id),
			)
			const mergedLayouts: DashboardLayouts = {}

			for (const [breakpoint, layout] of Object.entries(allLayouts)) {
				const hiddenItems = (layouts[breakpoint] ?? []).filter((item) => hiddenIds.has(item.i))
				mergedLayouts[breakpoint] = [...(layout ?? []), ...hiddenItems]
			}

			onLayoutChange(_currentLayout, mergedLayouts)
		},
		[isEditMode, instances, layouts, onLayoutChange],
	)

	if (isLoading) {
		return (
			<div className="flex min-h-[8rem] items-center justify-center">
				<Loader2 className="size-6 animate-spin text-primary" />
			</div>
		)
	}

	if (displayInstances.length === 0) {
		return (
			<div className="flex min-h-[8rem] flex-col items-center justify-center gap-3 text-center">
				<p className="text-sm font-medium text-foreground">No widgets on your dashboard</p>
				<p className="max-w-sm text-sm text-muted-foreground">
					{isEditMode
						? 'Add widgets from the library while editing.'
						: 'Enter edit mode to add widgets to your dashboard.'}
				</p>
			</div>
		)
	}

	return (
		<div
			className={cn(
				'dashboard-grid w-full',
				isEditMode && 'dashboard-grid--editing rounded-lg ring-1 ring-primary/25',
			)}
		>
			<ResponsiveGridLayout
				className="layout"
				layouts={displayLayouts}
				breakpoints={BREAKPOINTS}
				cols={COLS}
				rowHeight={ROW_HEIGHT}
				margin={[10, 10]}
				containerPadding={[0, 0]}
				draggableHandle=".widget-drag-handle"
				isDraggable={isEditMode}
				isResizable={isEditMode}
				onLayoutChange={handleLayoutChange}
				compactType="vertical"
			>
				{displayInstances.map((instance) => {
					const definition = getWidgetDefinition(instance.type)
					const isHidden = instance.hidden === true

					return (
						<div
							key={instance.id}
							className={cn(
								'relative',
								isEditMode && isHidden && 'opacity-45',
							)}
						>
							{isEditMode ? (
								<div className="absolute right-1 top-1 z-20 flex gap-0.5">
									<Button
										variant="ghost"
										size="icon"
										className="size-6 border border-border/60 bg-background/95 text-muted-foreground hover:border-primary/40 hover:text-primary"
										onClick={() => setWidgetHidden(instance.id, !isHidden)}
										aria-label={isHidden ? 'Show widget' : 'Hide widget'}
									>
										{isHidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-6 border border-border/60 bg-background/95 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
										onClick={() => removeWidget(instance.id)}
										aria-label={`Remove ${definition?.name ?? instance.type} widget`}
									>
										<X className="size-3" />
									</Button>
								</div>
							) : null}
							{isEditMode && isHidden ? (
								<div className="absolute left-2 top-1 z-20 rounded bg-background/90 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
									Hidden
								</div>
							) : null}
							<WidgetHost instanceId={instance.id} type={instance.type} />
						</div>
					)
				})}
			</ResponsiveGridLayout>
		</div>
	)
}
