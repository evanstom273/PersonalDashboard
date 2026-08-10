import {
	FileText,
	ImagePlus,
	MessageSquare,
	Music,
	Plus,
	Sparkles,
	Video,
} from 'lucide-react'
import { useRef } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { CHAT_MODEL_IDS } from '@/services/gemini/constants'
import { getModelById } from '@/services/gemini/models'
import type { GenerationMode } from '@/types/chat'
import { cn } from '@/utils/cn'

interface ChatAttachMenuProps {
	disabled?: boolean
	generationMode: GenerationMode
	selectedChatModelId: string
	onGenerationModeChange: (mode: GenerationMode) => void
	onChatModelChange: (modelId: string) => void
	onDocumentUpload: (file: File) => void
	onImageUpload: (file: File) => void
}

export function ChatAttachMenu({
	disabled,
	generationMode,
	selectedChatModelId,
	onGenerationModeChange,
	onChatModelChange,
	onDocumentUpload,
	onImageUpload,
}: ChatAttachMenuProps) {
	const documentInputRef = useRef<HTMLInputElement>(null)
	const imageInputRef = useRef<HTMLInputElement>(null)
	const chatModels = CHAT_MODEL_IDS.map((id) => getModelById(id)).filter(
		(model) => model !== undefined,
	)

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
					aria-label="Attach or choose generation mode"
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
					<DropdownMenuLabel>Generation mode</DropdownMenuLabel>
					<ModeMenuItem
						icon={Sparkles}
						label="Auto"
						description="Detect from your message"
						selected={generationMode === 'auto'}
						onSelect={() => onGenerationModeChange('auto')}
					/>
					<ModeMenuItem
						icon={MessageSquare}
						label="Chat"
						description="Text conversation"
						selected={generationMode === 'chat'}
						onSelect={() => onGenerationModeChange('chat')}
					/>
					<ModeMenuItem
						icon={ImagePlus}
						label="Image"
						description="Generate an image from your prompt"
						selected={generationMode === 'image'}
						onSelect={() => onGenerationModeChange('image')}
					/>
					<ModeMenuItem
						icon={Music}
						label="Music"
						description="Generate music or a clip"
						selected={generationMode === 'music'}
						onSelect={() => onGenerationModeChange('music')}
					/>
					<ModeMenuItem
						icon={Video}
						label="Video"
						description="Generate a video from your prompt"
						selected={generationMode === 'video'}
						onSelect={() => onGenerationModeChange('video')}
					/>

					{generationMode === 'chat' || generationMode === 'auto' ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuLabel>Chat model</DropdownMenuLabel>
							{chatModels.map((model) => (
								<ModelMenuItem
									key={model.id}
									label={model.name}
									description={model.description}
									selected={model.id === selectedChatModelId}
									onSelect={() => onChatModelChange(model.id)}
								/>
							))}
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}

function ModeMenuItem({
	icon: Icon,
	label,
	description,
	selected,
	onSelect,
}: {
	icon: typeof Sparkles
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
