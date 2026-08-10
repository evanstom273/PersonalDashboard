import { ExternalLink, Brain, Bell, KeyRound, PlugZap, Save, Sparkles, UserRound, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { validateApiKey } from '@/services/gemini/validate'
import { GEMINI_TTS_VOICES } from '@/services/gemini/ttsVoices'
import { GEMINI_MODELS, MODEL_CATEGORY_LABELS } from '@/services/gemini/models'
import { useTextToSpeechContext } from '@/providers/ChatProvider'
import {
	MEMORY_ARCHIVE_INTERVAL_OPTIONS,
	type MemoryArchiveInterval,
	type TtsReadAloudMode,
} from '@/storage/types'
import {
	canUseNotifications,
	getNotificationPermission,
	requestNotificationPermission,
} from '@/utils/notifications'

export function SettingsPage() {
	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const { previewVoice, status: speechStatus } = useTextToSpeechContext()
	const [apiKey, setApiKey] = useState('')
	const [userName, setUserName] = useState('')
	const [aiName, setAiName] = useState('')
	const [aiBehaviorInstructions, setAiBehaviorInstructions] = useState('')
	const [allowMatureContent, setAllowMatureContent] = useState(true)
	const [memoryArchiveInterval, setMemoryArchiveInterval] =
		useState<MemoryArchiveInterval>(20)
	const [ttsReadAloudMode, setTtsReadAloudMode] =
		useState<TtsReadAloudMode>('never')
	const [ttsVoiceName, setTtsVoiceName] = useState('Kore')
	const [savedApiKey, setSavedApiKey] = useState(false)
	const [savedIdentity, setSavedIdentity] = useState(false)
	const [isSavingApiKey, setIsSavingApiKey] = useState(false)
	const [isSavingIdentity, setIsSavingIdentity] = useState(false)
	const [isValidating, setIsValidating] = useState(false)
	const [validationMessage, setValidationMessage] = useState<string | null>(null)
	const [validationOk, setValidationOk] = useState<boolean | null>(null)
	const [notificationPermission, setNotificationPermission] = useState(
		getNotificationPermission(),
	)
	const [notificationMessage, setNotificationMessage] = useState<string | null>(
		null,
	)

	useEffect(() => {
		if (!isLoading) {
			setApiKey(preferences.geminiApiKey)
			setUserName(preferences.userName)
			setAiName(preferences.aiName)
			setAiBehaviorInstructions(preferences.aiBehaviorInstructions)
			setAllowMatureContent(preferences.allowMatureContent ?? true)
			setMemoryArchiveInterval(preferences.memoryArchiveInterval)
			setTtsReadAloudMode(preferences.ttsReadAloudMode)
			setTtsVoiceName(preferences.ttsVoiceName)
		}
	}, [isLoading, preferences])

	async function handleSaveApiKey(): Promise<void> {
		setIsSavingApiKey(true)
		setSavedApiKey(false)
		try {
			await savePreferences({
				...preferences,
				geminiApiKey: apiKey.trim(),
			})
			setSavedApiKey(true)
		} finally {
			setIsSavingApiKey(false)
		}
	}

	async function handleSaveIdentity(): Promise<void> {
		setIsSavingIdentity(true)
		setSavedIdentity(false)
		try {
			await savePreferences({
				...preferences,
				userName: userName.trim(),
				aiName: aiName.trim(),
				aiBehaviorInstructions: aiBehaviorInstructions.trim(),
				allowMatureContent,
			})
			setSavedIdentity(true)
		} finally {
			setIsSavingIdentity(false)
		}
	}

	async function handleMemoryIntervalChange(value: number): Promise<void> {
		const interval = MEMORY_ARCHIVE_INTERVAL_OPTIONS.includes(
			value as MemoryArchiveInterval,
		)
			? (value as MemoryArchiveInterval)
			: 20
		setMemoryArchiveInterval(interval)
		await savePreferences({
			...preferences,
			memoryArchiveInterval: interval,
		})
	}

	async function handleTtsReadAloudModeChange(value: TtsReadAloudMode): Promise<void> {
		setTtsReadAloudMode(value)
		await savePreferences({
			...preferences,
			ttsReadAloudMode: value,
		})
	}

	async function handleTtsVoiceChange(value: string): Promise<void> {
		setTtsVoiceName(value)
		await savePreferences({
			...preferences,
			ttsVoiceName: value,
		})
	}

	async function handleEnableNotifications(): Promise<void> {
		setNotificationMessage(null)
		if (!canUseNotifications()) {
			setNotificationMessage('Notifications are not supported in this browser.')
			return
		}

		const permission = await requestNotificationPermission()
		setNotificationPermission(permission)

		if (permission === 'granted') {
			setNotificationMessage(
				'Notifications enabled. You will get Android system alerts when a reply finishes in the background.',
			)
			return
		}

		if (permission === 'denied') {
			setNotificationMessage(
				'Notifications are blocked. Enable them in Android app settings for this PWA or Chrome.',
			)
			return
		}

		setNotificationMessage('Notification permission was not granted.')
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
					Configure identity, behaviour, and your bring-your-own Gemini API key.
				</p>
			</header>

			<ScrollArea className="h-full min-h-0 flex-1">
				<div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:space-y-8 md:px-6 md:py-8">
					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<div className="flex items-center gap-2">
							<UserRound className="h-5 w-5 text-primary" />
							<h2 className="text-lg font-medium">Your name</h2>
						</div>
						<p className="text-sm text-muted-foreground">
							This tells the assistant what to call you in future responses.
						</p>
						<input
							value={userName}
							onChange={(event) => {
								setUserName(event.target.value)
								setSavedIdentity(false)
							}}
							placeholder="Your name"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<div className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-primary" />
							<h2 className="text-lg font-medium">AI name</h2>
						</div>
						<p className="text-sm text-muted-foreground">
							Choose any name for your assistant. This name is used across the
							app interface and in system instructions.
						</p>
						<input
							value={aiName}
							onChange={(event) => {
								setAiName(event.target.value)
								setSavedIdentity(false)
							}}
							placeholder="Assistant"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<h2 className="text-lg font-medium">How should your AI respond?</h2>
						<p className="text-sm text-muted-foreground">
							Free-form behavioural instructions. Keep it short with traits like
							&quot;Warm, conversational, witty, direct, British English&quot; or
							write a longer custom prompt.
						</p>
						<textarea
							value={aiBehaviorInstructions}
							onChange={(event) => {
								setAiBehaviorInstructions(event.target.value)
								setSavedIdentity(false)
							}}
							rows={8}
							placeholder="Warm, conversational, witty, direct, British English"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
						<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
							<input
								type="checkbox"
								checked={allowMatureContent}
								onChange={(event) => {
									setAllowMatureContent(event.target.checked)
									setSavedIdentity(false)
								}}
								className="mt-0.5"
							/>
							<span>
								<span className="block font-medium">Allow mature content</span>
								<span className="mt-1 block text-muted-foreground">
									Lets chat match your tone (including swearing), relaxes
									Gemini&apos;s adjustable filters for chat, image, and music
									generation, and allows adult people in generated images.
									Illegal content (e.g. CSAM) is always blocked by Google. Turn
									off for stricter filtering.
								</span>
							</span>
						</label>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={() => void handleSaveIdentity()}
								disabled={isSavingIdentity}
							>
								<Save className="h-4 w-4" />
								{isSavingIdentity ? 'Saving…' : 'Save identity'}
							</Button>
							{savedIdentity ? (
								<span className="text-sm text-primary">Identity saved</span>
							) : null}
						</div>
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<div className="flex items-center gap-2">
							<Brain className="h-5 w-5 text-primary" />
							<h2 className="text-lg font-medium">Memory archival</h2>
						</div>
						<p className="text-sm text-muted-foreground">
							After this many new chat messages, the assistant reads the batch and
							archives durable facts into Memory. Lower values update memory more
							often; higher values wait for more context per archive pass.
						</p>
						<div className="space-y-3">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Archive every</span>
								<span className="font-medium">
									{memoryArchiveInterval} messages
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={MEMORY_ARCHIVE_INTERVAL_OPTIONS.length - 1}
								step={1}
								value={Math.max(
									0,
									MEMORY_ARCHIVE_INTERVAL_OPTIONS.indexOf(
										memoryArchiveInterval,
									),
								)}
								onChange={(event) => {
									const index = Number(event.target.value)
									const next = MEMORY_ARCHIVE_INTERVAL_OPTIONS[index] ?? 20
									void handleMemoryIntervalChange(next)
								}}
								className="w-full accent-primary"
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								{MEMORY_ARCHIVE_INTERVAL_OPTIONS.map((option) => (
									<span key={option}>{option}</span>
								))}
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							View archived facts anytime from the Memory tab in the sidebar.
						</p>
					</section>

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
								setSavedApiKey(false)
								setValidationMessage(null)
								setValidationOk(null)
							}}
							placeholder="AIza..."
							autoComplete="off"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={() => void handleSaveApiKey()}
								disabled={isSavingApiKey}
							>
								<Save className="h-4 w-4" />
								{isSavingApiKey ? 'Saving…' : 'Save key'}
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleValidate()}
								disabled={isValidating || !apiKey.trim()}
							>
								<PlugZap className="h-4 w-4" />
								{isValidating ? 'Validating…' : 'Validate connection'}
							</Button>
							{savedApiKey ? (
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

					<section className="space-y-3 rounded-xl border border-border bg-card p-5">
						<h2 className="text-lg font-medium">Voice input</h2>
						<p className="text-sm text-muted-foreground">
							On desktop, the mic uses your browser&apos;s speech recognition.
							On Android and installed apps, it records a short clip and sends
							it to your default chat model for transcription using your Gemini
							API key. Allow microphone access when prompted.
						</p>
						<p className="text-sm text-muted-foreground">
							Tap the mic, speak, then tap Continue to transcribe. If voice
							input still fails in an installed app, open the site in Chrome
							instead of the home-screen shortcut.
						</p>
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<div className="flex items-center gap-2">
							<Volume2 className="h-5 w-5 text-primary" />
							<h2 className="text-lg font-medium">Voice output</h2>
						</div>
						<p className="text-sm text-muted-foreground">
							Have Gemini read assistant replies aloud using the Gemini TTS
							model. Chat text is always shown normally — speech is an optional
							output layer on top.
						</p>

						<div className="space-y-2">
							<label
								htmlFor="tts-read-aloud-mode"
								className="text-sm font-medium"
							>
								Read responses aloud
							</label>
							<select
								id="tts-read-aloud-mode"
								value={ttsReadAloudMode}
								onChange={(event) => {
									void handleTtsReadAloudModeChange(
										event.target.value as TtsReadAloudMode,
									)
								}}
								className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
							>
								<option value="never">Never</option>
								<option value="after_speech">When I use the microphone</option>
								<option value="always">Always</option>
							</select>
						</div>

						<div className="space-y-2">
							<label htmlFor="tts-voice-name" className="text-sm font-medium">
								Speaking voice
							</label>
							<div className="flex flex-wrap items-center gap-3">
								<select
									id="tts-voice-name"
									value={ttsVoiceName}
									onChange={(event) => {
										void handleTtsVoiceChange(event.target.value)
									}}
									className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
								>
									{GEMINI_TTS_VOICES.map((voice) => (
										<option key={voice.name} value={voice.name}>
											{voice.name} — {voice.description}
										</option>
									))}
								</select>
								<Button
									type="button"
									variant="outline"
									disabled={
										!preferences.geminiApiKey.trim() ||
										speechStatus === 'loading' ||
										speechStatus === 'playing'
									}
									onClick={() => {
										void previewVoice(ttsVoiceName)
									}}
								>
									<Volume2 className="h-4 w-4" />
									{speechStatus === 'loading' ? 'Loading…' : 'Preview'}
								</Button>
							</div>
							<p className="text-sm text-muted-foreground">
								Uses your saved Gemini API key and the{' '}
								<span className="font-medium text-foreground">
									gemini-3.1-flash-tts-preview
								</span>{' '}
								model. Manual playback only runs when you tap Listen on a reply.
							</p>
						</div>
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<div className="flex items-center gap-2">
							<Bell className="h-5 w-5 text-primary" />
							<h2 className="text-lg font-medium">Android &amp; system notifications</h2>
						</div>
						<p className="text-sm text-muted-foreground">
							Get a real phone notification when a chat reply finishes while you are
							in another app, or browsing Library / Memory / Settings in the installed
							PWA. Tap the notification to jump back to chat.
						</p>
						<p className="text-sm text-muted-foreground">
							Status:{' '}
							<span className="font-medium text-foreground">
								{notificationPermission === 'granted'
									? 'Enabled'
									: notificationPermission === 'denied'
										? 'Blocked'
										: 'Not enabled yet'}
							</span>
						</p>
						{notificationPermission !== 'granted' ? (
							<Button
								variant="outline"
								onClick={() => void handleEnableNotifications()}
							>
								<Bell className="h-4 w-4" />
								Enable notifications
							</Button>
						) : null}
						{notificationMessage ? (
							<p className="text-sm text-muted-foreground">{notificationMessage}</p>
						) : null}
					</section>

					<section className="space-y-3 rounded-xl border border-border bg-card p-5">
						<h2 className="text-lg font-medium">Background replies</h2>
						<p className="text-sm text-muted-foreground">
							Chat keeps generating if you switch to Library, Memory, or Settings.
							You will see an in-app banner while a reply is in progress. With
							notifications enabled, Android also shows a system tray alert when the
							reply is ready.
						</p>
					</section>

					<section className="space-y-3 rounded-xl border border-border bg-card p-5">
						<h2 className="text-lg font-medium">Web search</h2>
						<p className="text-sm text-muted-foreground">
							Enable <span className="font-medium text-foreground">Web search</span>{' '}
							from the + menu in chat to look up wikis and current info via Google.
							Gemini 3 includes about 5,000 search queries per month free, then
							roughly $14 per 1,000 queries — billed per search the model runs, not
							per chat message.
						</p>
					</section>

					<section className="space-y-4 rounded-xl border border-border bg-card p-5">
						<h2 className="text-lg font-medium">Available models</h2>
						<p className="text-sm text-muted-foreground">
							Use the + menu in chat to pick your default chat, image, and music
							models. Say things like &quot;generate an image of…&quot; or
							&quot;generate music&quot; and the app uses your chosen model for
							that type.
						</p>
						<div className="space-y-4">
							{(['chat', 'image', 'music'] as const).map((category) => (
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
