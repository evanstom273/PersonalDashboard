import { Loader2 } from 'lucide-react'
import { useStorageValue } from '@/storage/hooks/useStorageValue'
import { STORAGE_STORES } from '@/storage/types'
import { useWidgetSettings } from '@/widgets/registry'

interface NotesSettings {
	title: string
}

const DEFAULT_SETTINGS: NotesSettings = {
	title: 'Notes',
}

export function NotesWidget({ instanceId }: { instanceId: string }) {
	const { settings, isLoading: settingsLoading } = useWidgetSettings<NotesSettings>(
		instanceId,
		DEFAULT_SETTINGS,
	)
	const {
		value: content,
		setValue: setContent,
		isLoading: contentLoading,
	} = useStorageValue(
		STORAGE_STORES.NOTES,
		instanceId,
		'',
	)

	const isLoading = settingsLoading || contentLoading

	return (
		<div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
			<div className="widget-drag-handle shrink-0 border-b border-dashed border-border/80 px-3 py-2">
				<p className="text-xs font-medium text-muted-foreground">{settings.title}</p>
			</div>

			<div className="relative min-h-0 flex-1 p-2">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<Loader2 className="size-5 animate-spin text-primary" />
					</div>
				) : (
					<div
						className="relative h-full min-h-[4rem] rounded-md border border-border/60 bg-surface"
						style={{
							backgroundImage:
								'linear-gradient(transparent 23px, color-mix(in srgb, var(--border) 65%, transparent) 24px)',
							backgroundSize: '100% 24px',
						}}
					>
						<textarea
							className="absolute inset-0 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/70"
							placeholder="Jot something down…"
							value={content}
							onChange={(event) => {
								setContent(event.target.value)
							}}
						/>
					</div>
				)}
			</div>
		</div>
	)
}
