import { Loader2 } from 'lucide-react'
import { WidgetFrame } from '@/components/WidgetFrame'
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
		<WidgetFrame title={settings.title} description="Persisted in IndexedDB">
			{isLoading ? (
				<div className="flex h-full items-center justify-center">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<textarea
					className="h-full min-h-[120px] w-full resize-none rounded-lg border border-border/50 bg-background/40 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
					placeholder="Write a note..."
					value={content}
					onChange={(event) => {
						setContent(event.target.value)
					}}
				/>
			)}
		</WidgetFrame>
	)
}
