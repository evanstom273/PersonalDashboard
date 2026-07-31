import type { WidgetComponentProps } from '@/types/widget'
import { getWidgetDefinition } from './registry'
import { WidgetFrame } from '@/components/WidgetFrame'

export function WidgetHost({ instanceId, type }: WidgetComponentProps & { type: string }) {
	const definition = getWidgetDefinition(type)

	if (!definition) {
		return (
			<WidgetFrame title="Unknown widget" description="This widget type is not registered.">
				<p className="text-sm text-muted-foreground">
					Widget type &quot;{type}&quot; could not be found in the registry.
				</p>
			</WidgetFrame>
		)
	}

	const Component = definition.component
	return <Component instanceId={instanceId} />
}
