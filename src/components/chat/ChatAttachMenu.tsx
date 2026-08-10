import {
	FileText,
	Globe,
	ImagePlus,
	MessageSquare,
	Music,
	Plus,
	Video,
} from 'lucide-react'
import { useRef } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { CHAT_MODEL_IDS } from '@/services/gemini/constants'
import {
	getModelById,
	getModelsByCategory,
	MODEL_CATEGORY_LABELS,
	type ModelCategory,
} from '@/services/gemini/models'
import { cn } from '@/utils/cn'

interface ChatAttachMenuProps {
	disabled?: boolean
	webSearchEnabled: boolean
	selectedChatModelId: string
	selectedImageModelId: string
	selectedMusicModelId: string
	selectedVideoModelId: string
	onWebSearchChange: (enabled: boolean) => void
	onChatModelChange: (modelId: string) => void
	onImageModelChange: (modelId: string) => void
	onMusicModelChange: (modelId: string) => void
	onVideoModelChange: (modelId: string) => void
	onDocumentUpload: (file: File) => void
	onImageUpload: (file: File) => void
}

const CATEGORY_ICONS = {
	chat: MessageSquare,
	image: ImagePlus,
	music: Music,
	video: Video,
} as const

export function ChatAttachMenu({
	disabled,
	webSearchEnabled,
	selectedChatModelId,
	selectedImageModelId,
	selectedMusicModelId,
	selectedVideoModelId,
	onWebSearchChange,
	onChatModelChange,
	onImageModelChange,
	onMusicModelChange,
	onVideoModelChange,
	onDocumentUpload,
	onImageUpload,
}: ChatAttachMenuProps) {
	const documentInputRef = useRef<HTMLInputElement>(null)
	const imageInputRef = useRef<HTMLInputElement>(null)
	const chatModels = CHAT_MODEL_IDS.map((id) => getModelById(id)).filter(
		(model) => model !== undefined,
	)

	const selectedByCategory: Record<Exclude<ModelCategory, 'chat'>, string> = {
		image: selectedImageModelId,
		music: selectedMusicModelId,
		video: selectedVideoModelId,
	}

	const onModelChangeByCategory: Record<
		Exclude<ModelCategory, 'chat'>,
		(modelId: string) => void
	> = {
		image: onImageModelChange,
		music: onMusicModelChange,
		video: onVideoModelChange,
	}

	return (
		<>
			<input
				ref={documentInputRef}
				type="file"
				accept=".txt,.md,.markdown,.html,.htm,.json,.csv,.xml,.yml,.yaml,text/*"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0]
					if (file) {
						onDocumentUpload(file)
					}
					event.target.value = ''
				}}
			/>
			<input
				ref={imageInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0]
					if (file) {
						onImageUpload(file)
					}
					event.target.value = ''
				}}
			/>

			<DropdownMenu>
				<DropdownMenuTrigger
					hideChevron
					disabled={disabled}
					className="h-10 w-10 shrink-0 justify-center p-0"
					aria-label="Attach files or choose models"
				>
					<Plus className="h-4 w-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start" className="w-72">
					<DropdownMenuLabel>Attach</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={() => {
							documentInputRef.current?.click()
						}}
					>
						<FileText className="h-4 w-4" />
						Upload document
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => {
							imageInputRef.current?.click()
						}}
					>
						<ImagePlus className="h-4 w-4" />
						Upload image
					</DropdownMenuItem>

					<DropdownMenuSeparator />
					<DropdownMenuLabel>Chat</DropdownMenuLabel>
					<ToggleMenuItem
						icon={Globe}
						label="Web search"
						description="Look up wikis and current info via Google"
						selected={webSearchEnabled}
						onSelect={() => onWebSearchChange(!webSearchEnabled)}
					/>
					{chatModels.map((model) => (
						<ModelMenuItem
							key={model.id}
							label={model.name}
							description={model.description}
							selected={model.id === selectedChatModelId}
							onSelect={() => onChatModelChange(model.id)}
						/>
					))}

					{(['image', 'music', 'video'] as const).map((category) => {
						const Icon = CATEGORY_ICONS[category]
						const selectedModel = getModelById(selectedByCategory[category])
						const models = getModelsByCategory(category)

						return (
							<DropdownMenuSub key={category}>
								<DropdownMenuSubTrigger className="flex items-start gap-3 py-2.5">
									<Icon className="mt-0.5 h-4 w-4 shrink-0" />
									<span className="min-w-0 flex-1">
										<span className="block font-medium">
											{MODEL_CATEGORY_LABELS[category]}
										</span>
										<span className="block truncate text-xs text-muted-foreground">
											{selectedModel?.name ?? 'Select model'}
										</span>
									</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="w-72">
									<DropdownMenuLabel>
										{MODEL_CATEGORY_LABELS[category]} model
									</DropdownMenuLabel>
									{models.map((model) => (
										<ModelMenuItem
											key={model.id}
											label={model.name}
											description={model.description}
											selected={model.id === selectedByCategory[category]}
											onSelect={() => onModelChangeByCategory[category](model.id)}
										/>
									))}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}

function ToggleMenuItem({
	icon: Icon,
	label,
	description,
	selected,
	onSelect,
}: {
	icon: typeof Globe
	label: string
	description: string
	selected: boolean
	onSelect: () => void
}) {
	return (
		<DropdownMenuItem
			onSelect={onSelect}
			className={cn('flex items-start gap-3 py-2.5', selected && 'bg-accent/60')}
		>
			<Icon className="mt-0.5 h-4 w-4 shrink-0" />
			<span className="min-w-0">
				<span className="block font-medium">{label}</span>
				<span className="block text-xs text-muted-foreground">{description}</span>
			</span>
		</DropdownMenuItem>
	)
}
