import { Plus } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	DEV_STUDIO_MODELS,
	resolveDevStudioModelId,
} from '@/services/devStudio/devStudioModels'

interface DevStudioModelSelectorProps {
	disabled?: boolean
}

export function DevStudioModelSelector({ disabled }: DevStudioModelSelectorProps = {}) {
	const { preferences, savePreferences } = usePreferencesContext()
	const modelId = resolveDevStudioModelId(preferences.devStudioModelId)
	const selected = DEV_STUDIO_MODELS.find((model) => model.id === modelId)

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger
				hideChevron
				disabled={disabled}
				className="h-9 w-9 shrink-0 justify-center p-0 rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				aria-label="Select Dev Studio model"
				title={`Model: ${selected?.name ?? 'Select model'}`}
			>
				<Plus className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent side="top" align="start" collisionPadding={12} className="w-80">
				<DropdownMenuLabel>
					<span className="block font-semibold text-foreground">Code Agent Model</span>
					<span className="block text-xs font-normal text-muted-foreground">
						Active: {selected?.name ?? 'Select model'}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{DEV_STUDIO_MODELS.map((model) => (
					<ModelMenuItem
						key={model.id}
						label={`${model.name} · ${model.analogy}`}
						description={model.description}
						selected={model.id === modelId}
						onSelect={() => {
							void savePreferences({
								...preferences,
								devStudioModelId: model.id,
							})
						}}
					/>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
