import { ExternalLink, KeyRound, PlugZap, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { validateApiKey } from '@/services/gemini/validate'
import { GEMINI_MODELS, MODEL_CATEGORY_LABELS } from '@/services/gemini/models'

export function SettingsPage() {
	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const [apiKey, setApiKey] = useState('')
	const [saved, setSaved] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isValidating, setIsValidating] = useState(false)
	const [validationMessage, setValidationMessage] = useState<string | null>(null)
	const [validationOk, setValidationOk] = useState<boolean | null>(null)

	useEffect(() => {
		if (!isLoading) {
			setApiKey(preferences.geminiApiKey)
		}
	}, [isLoading, preferences.geminiApiKey])

	async function handleSave(): Promise<void> {
		setIsSaving(true)
		setSaved(false)
		try {
			await savePreferences({
				...preferences,
				geminiApiKey: apiKey.trim(),
			})
			setSaved(true)
		} finally {
			setIsSaving(false)
		}
	}

	async function handleValidate(): Promise<void> {
		setIsValidating(true)
		setValidationMessage(null)
		setValidationOk(null)
		try {
			const result = await validateApiKey(apiKey)
			setValidationOk(result.ok)
			setValidationMessage(result.message)
		} finally {
			setIsValidating(false)
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border px-4 py-4 md:px-6">
				<h1 className="text-xl font-semibold md:text-2xl">Settings</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Connect your own Gemini API key. Keys are stored locally in IndexedDB
					and sent directly to Google&apos;s API from your browser.
				</p>
			</header>

			<ScrollArea className="h-full min-h-0 flex-1">
				<div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:space-y-8 md:px-6 md:py-8">
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
								setValidationMessage(null)
								setValidationOk(null)
							}}
							placeholder="AIza..."
							autoComplete="off"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
						<div className="flex flex-wrap items-center gap-3">
							<Button onClick={() => void handleSave()} disabled={isSaving}>
								<Save className="h-4 w-4" />
								{isSaving ? 'Saving…' : 'Save key'}
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleValidate()}
								disabled={isValidating || !apiKey.trim()}
							>
								<PlugZap className="h-4 w-4" />
								{isValidating ? 'Validating…' : 'Validate connection'}
							</Button>
							{saved ? (
								<span className="text-sm text-primary">Key saved</span>
							) : null}
						</div>
						{validationMessage ? (
							<p
								className={
									validationOk
										? 'text-sm text-primary'
										: 'text-sm text-destructive'
								}
							>
								{validationMessage}
							</p>
						) : null}
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<h2 className="text-lg font-medium">Available models</h2>
						<p className="text-sm text-muted-foreground">
							Home lets you switch between Gemini 3.6 Flash and 3.1 Pro. Try
							phrases like &quot;generate an image of…&quot;, &quot;generate
							music&quot;, or &quot;create a video&quot; in chat to use the
							models below.
						</p>
						<div className="space-y-4">
							{(['chat', 'image', 'music', 'video'] as const).map((category) => (
								<div key={category}>
									<h3 className="mb-2 text-sm font-medium text-muted-foreground">
										{MODEL_CATEGORY_LABELS[category]}
									</h3>
									<ul className="space-y-2">
										{GEMINI_MODELS.filter(
											(model) => model.category === category,
										).map((model) => (
											<li
												key={model.id}
												className="rounded-lg border border-border/60 px-3 py-2 text-sm"
											>
												<p className="font-medium">{model.name}</p>
												<p className="text-xs text-muted-foreground">
													{model.id} — {model.description}
												</p>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</section>

					<Separator />
				</div>
			</ScrollArea>
		</div>
	)
}
