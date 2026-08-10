import { ExternalLink, KeyRound, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { GEMINI_MODELS, MODEL_CATEGORY_LABELS } from '@/services/gemini/models'

export function SettingsPage() {
	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const [apiKey, setApiKey] = useState('')
	const [defaultModelId, setDefaultModelId] = useState(preferences.defaultModelId)
	const [saved, setSaved] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		if (!isLoading) {
			setApiKey(preferences.geminiApiKey)
			setDefaultModelId(preferences.defaultModelId)
		}
	}, [isLoading, preferences])

	async function handleSave(): Promise<void> {
		setIsSaving(true)
		setSaved(false)
		try {
			await savePreferences({
				geminiApiKey: apiKey.trim(),
				defaultModelId,
			})
			setSaved(true)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			<header className="border-b border-border px-6 py-5">
				<h1 className="text-2xl font-semibold">Settings</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Connect your own Gemini API key. Keys are stored locally in IndexedDB
					and sent directly to Google&apos;s API from your browser.
				</p>
			</header>

			<div className="mx-auto w-full max-w-2xl space-y-8 px-6 py-8">
				<section className="space-y-4 rounded-xl border border-border bg-card p-5">
					<div className="flex items-center gap-2">
						<KeyRound className="h-5 w-5 text-primary" />
						<h2 className="text-lg font-medium">Gemini API key</h2>
					</div>
					<p className="text-sm text-muted-foreground">
						Get a key from{' '}
						<a
							href="https://aistudio.google.com/apikey"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-primary hover:underline"
						>
							Google AI Studio
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
						. Your key never leaves this device except when calling Gemini.
					</p>
					<input
						type="password"
						value={apiKey}
						onChange={(event) => {
							setApiKey(event.target.value)
							setSaved(false)
						}}
						placeholder="AIza..."
						autoComplete="off"
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
					/>
				</section>

				<section className="space-y-4 rounded-xl border border-border bg-card p-5">
					<h2 className="text-lg font-medium">Default model</h2>
					<p className="text-sm text-muted-foreground">
						Used when starting a new chat from the sidebar.
					</p>
					<ModelSelector value={defaultModelId} onChange={setDefaultModelId} />
				</section>

				<section className="space-y-4 rounded-xl border border-border bg-card p-5">
					<h2 className="text-lg font-medium">Available models</h2>
					<div className="space-y-4">
						{(['chat', 'image', 'music', 'video'] as const).map((category) => (
							<div key={category}>
								<h3 className="mb-2 text-sm font-medium text-muted-foreground">
									{MODEL_CATEGORY_LABELS[category]}
								</h3>
								<ul className="space-y-2">
									{GEMINI_MODELS.filter((model) => model.category === category).map(
										(model) => (
											<li
												key={model.id}
												className="rounded-lg border border-border/60 px-3 py-2 text-sm"
											>
												<p className="font-medium">{model.name}</p>
												<p className="text-xs text-muted-foreground">
													{model.id} — {model.description}
												</p>
											</li>
										),
									)}
								</ul>
							</div>
						))}
					</div>
				</section>

				<Separator />

				<div className="flex flex-wrap items-center gap-3">
					<Button onClick={() => void handleSave()} disabled={isSaving}>
						<Save className="h-4 w-4" />
						{isSaving ? 'Saving…' : 'Save settings'}
					</Button>
					{saved ? (
						<span className="text-sm text-primary">Settings saved</span>
					) : null}
					<Button asChild variant="outline">
						<Link to="/">Back to chat</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
