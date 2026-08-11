import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuTriggerContent,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	DEV_STUDIO_MODELS,
	resolveDevStudioModelId,
} from '@/services/devStudio/devStudioModels'

export function DevStudioModelSelector() {
	const { preferences, savePreferences } = usePreferencesContext()
	const modelId = resolveDevStudioModelId(preferences.devStudioModelId)
	const selected = DEV_STUDIO_MODELS.find((model) => model.id === modelId)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<DropdownMenuTriggerContent
					label={selected?.name ?? 'Select model'}
					subtitle="Code agent"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
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
