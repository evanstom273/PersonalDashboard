import { Bot, ChevronDown, FileText, ImagePlus, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { cn } from '@/utils/cn'

interface DevStudioAttachMenuProps {
	disabled?: boolean
	onDocumentUpload?: (files: File[]) => void
	onImageUpload?: (files: File[]) => void
}

export function DevStudioAttachMenu({
	disabled,
	onDocumentUpload,
	onImageUpload,
}: DevStudioAttachMenuProps) {
	const documentInputRef = useRef<HTMLInputElement>(null)
	const imageInputRef = useRef<HTMLInputElement>(null)
	const [menuOpen, setMenuOpen] = useState(false)
	const [modelExpanded, setModelExpanded] = useState(false)

	const { preferences, savePreferences } = usePreferencesContext()
	const modelId = resolveDevStudioModelId(preferences.devStudioModelId)
	const selected = DEV_STUDIO_MODELS.find((model) => model.id === modelId)

	function handleMenuOpenChange(open: boolean): void {
		setMenuOpen(open)
		if (!open) {
			setModelExpanded(false)
		}
	}

	return (
		<>
			<input
				ref={documentInputRef}
				type="file"
				multiple
				accept=".txt,.md,.markdown,.html,.htm,.json,.csv,.xml,.yml,.yaml,.pdf,text/*,application/pdf"
				className="hidden"
				onChange={(event) => {
					const files = Array.from(event.target.files ?? [])
					if (files.length > 0 && onDocumentUpload) {
						onDocumentUpload(files)
					}
					event.target.value = ''
				}}
			/>
			<input
				ref={imageInputRef}
				type="file"
				multiple
				accept="image/*"
				className="hidden"
				onChange={(event) => {
					const files = Array.from(event.target.files ?? [])
					if (files.length > 0 && onImageUpload) {
						onImageUpload(files)
					}
					event.target.value = ''
				}}
			/>

			<DropdownMenu modal={false} open={menuOpen} onOpenChange={handleMenuOpenChange}>
				<DropdownMenuTrigger
					hideChevron
					disabled={disabled}
					className="h-9 w-9 shrink-0 justify-center rounded-lg p-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					aria-label="Attach files or choose model"
					title={`Attach files or change model (${selected?.name ?? 'Select model'})`}
				>
					<Plus className="h-4 w-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side="top"
					align="start"
					collisionPadding={12}
					className="w-[min(18rem,calc(100vw-1.5rem))] max-h-[min(70svh,24rem)] overflow-y-auto"
				>
					<DropdownMenuLabel>Attach</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={() => {
							documentInputRef.current?.click()
						}}
					>
						<FileText className="h-4 w-4" />
						Upload documents
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => {
							imageInputRef.current?.click()
						}}
					>
						<ImagePlus className="h-4 w-4" />
						Upload images
					</DropdownMenuItem>

					<DropdownMenuSeparator />
					<DropdownMenuLabel>Code Agent Model</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault()
							setModelExpanded((current) => !current)
						}}
						className={cn(
							'flex items-start gap-3 py-2.5',
							modelExpanded && 'bg-accent/60',
						)}
					>
						<Bot className="mt-0.5 h-4 w-4 shrink-0" />
						<span className="min-w-0 flex-1">
							<span className="block font-medium">Model</span>
							<span className="block truncate text-xs text-muted-foreground">
								{selected?.name ?? 'Select model'}
							</span>
						</span>
						<ChevronDown
							className={cn(
								'mt-0.5 h-4 w-4 shrink-0 opacity-60 transition-transform',
								modelExpanded && 'rotate-180',
							)}
						/>
					</DropdownMenuItem>
					{modelExpanded ? (
						<>
							{DEV_STUDIO_MODELS.map((model) => (
								<ModelMenuItem
									key={model.id}
									label={`${model.name} · ${model.analogy}`}
									description={`${model.description} (up to ${model.maxIterations} tool steps)`}
									selected={model.id === modelId}
									onSelect={() => {
										void savePreferences({
											...preferences,
											devStudioModelId: model.id,
										})
									}}
									className="pl-8"
								/>
							))}
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}

export const DevStudioModelSelector = DevStudioAttachMenu
