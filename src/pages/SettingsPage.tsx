import {
	Bell,
	Brain,
	Code2,
	Download,
	ExternalLink,
	KeyRound,
	Mic,
	PlugZap,
	RefreshCw,
	Save,
	Sparkles,
	Trash2,
	UserRound,
	Volume2,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DevStudioRepositorySelect } from '@/components/devStudio/DevStudioRepositorySelect'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePreferencesContext, useTextToSpeechContext, useMainConversationContext } from '@/providers/ChatProvider'
import { validateApiKey } from '@/services/gemini/validate'
import {
	requestBackgroundReminderNotificationPermission,
	syncBackgroundReminderNotifications,
} from '@/services/reminders/reminderBackgroundNotifications'
import { canUseNotificationTriggers } from '@/services/reminders/reminderNotificationTriggers'
import { GEMINI_TTS_VOICES } from '@/services/gemini/ttsVoices'
import { GEMINI_MODELS, MODEL_CATEGORY_LABELS } from '@/services/gemini/models'
import {
	MEMORY_ARCHIVE_INTERVAL_OPTIONS,
	type MemoryArchiveInterval,
	type TtsReadAloudMode,
} from '@/storage/types'
import {
	canUseNotifications,
	getNotificationPermission,
	isStandaloneDisplayMode,
	requestNotificationPermission,
} from '@/utils/notifications'
import { isCapacitorNativePlatform } from '@/utils/capacitor'
import { cn } from '@/utils/cn'
import { downloadAppReferenceMarkdown, downloadChangelogMarkdown } from '@/utils/downloads'
import {
	APP_VERSION,
	CHANGELOG,
	formatChangelogDate,
} from '@/data/changelog'
import { clearAllMemory } from '@/services/memory/memoryService'
import {
	getUnarchivedMessages,
	runManualMemoryArchive,
} from '@/services/memory/memoryArchive'
import {
	resolveSettingsTabFromParams,
	type SettingsTab,
} from '@/navigation/swipeNav'

const SETTINGS_TABS = [
	{ id: 'profile', label: 'Profile', icon: UserRound },
	{ id: 'memory', label: 'Memory', icon: Brain },
	{ id: 'api', label: 'API', icon: KeyRound },
	{ id: 'voice', label: 'Voice', icon: Volume2 },
	{ id: 'app', label: 'App', icon: Bell },
] as const

export function SettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const activeTab = resolveSettingsTabFromParams(searchParams)

	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const { conversation, saveConversation } = useMainConversationContext()
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
	const [allowCodebaseInspection, setAllowCodebaseInspection] = useState(true)
	const [githubPat, setGithubPat] = useState('')
	const [devStudioRepository, setDevStudioRepository] = useState('')
	const [devStudioBranch, setDevStudioBranch] = useState('main')
	const [savedDevStudio, setSavedDevStudio] = useState(false)
	const [isSavingDevStudio, setIsSavingDevStudio] = useState(false)
	const [memoryActionMessage, setMemoryActionMessage] = useState<string | null>(
		null,
	)
	const [isClearingMemory, setIsClearingMemory] = useState(false)
	const [isArchivingMemory, setIsArchivingMemory] = useState(false)

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
			setAllowCodebaseInspection(preferences.allowCodebaseInspection ?? true)
			setGithubPat(preferences.githubPat)
			setDevStudioRepository(preferences.devStudioRepository)
			setDevStudioBranch(preferences.devStudioBranch || 'main')
		}
	}, [isLoading, preferences])

	function setActiveTab(tab: SettingsTab): void {
		setSearchParams(tab === 'profile' ? {} : { tab })
	}

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

	async function handleAllowCodebaseInspectionChange(value: boolean): Promise<void> {
		setAllowCodebaseInspection(value)
		await savePreferences({
			...preferences,
			allowCodebaseInspection: value,
		})
	}

	async function handleSaveDevStudio(): Promise<void> {
		setIsSavingDevStudio(true)
		setSavedDevStudio(false)
		try {
			await savePreferences({
				...preferences,
				githubPat: githubPat.trim(),
				devStudioRepository: devStudioRepository.trim(),
				devStudioBranch: devStudioBranch.trim() || 'main',
			})
			setSavedDevStudio(true)
			window.setTimeout(() => setSavedDevStudio(false), 2000)
		} finally {
			setIsSavingDevStudio(false)
		}
	}

	async function handleClearMemory(): Promise<void> {
		if (
			!window.confirm(
				'Clear all archived memory? This cannot be undone. Chat messages are not deleted.',
			)
		) {
			return
		}

		setIsClearingMemory(true)
		setMemoryActionMessage(null)
		try {
			await clearAllMemory()
			setMemoryActionMessage('All memory entries cleared.')
		} catch (error) {
			setMemoryActionMessage(
				error instanceof Error ? error.message : 'Could not clear memory.',
			)
		} finally {
			setIsClearingMemory(false)
		}
	}

	async function handleManualMemoryArchive(): Promise<void> {
		if (!conversation) {
			setMemoryActionMessage('No chat history to archive yet.')
			return
		}

		const unarchivedCount = getUnarchivedMessages(conversation).length
		if (unarchivedCount === 0) {
			setMemoryActionMessage('No unarchived chat messages left to process.')
			return
		}

		setIsArchivingMemory(true)
		setMemoryActionMessage(null)
		try {
			const { conversation: updated, result } = await runManualMemoryArchive(
				preferences.geminiApiKey,
				preferences.defaultModelId,
				conversation,
				preferences,
			)

			if (
				updated.memoryArchiveCursor !== (conversation.memoryArchiveCursor ?? 0)
			) {
				await saveConversation(updated)
			}

			if (result.messagesArchived === 0) {
				setMemoryActionMessage('No chat messages were archived.')
			} else if (result.memoriesAdded === 0) {
				setMemoryActionMessage(
					`Processed ${result.messagesArchived} message${result.messagesArchived === 1 ? '' : 's'} — nothing new worth saving.`,
				)
			} else {
				setMemoryActionMessage(
					`Archived ${result.memoriesAdded} fact${result.memoriesAdded === 1 ? '' : 's'} from ${result.messagesArchived} message${result.messagesArchived === 1 ? '' : 's'}.`,
				)
			}
		} catch (error) {
			setMemoryActionMessage(
				error instanceof Error ? error.message : 'Memory archive failed.',
			)
		} finally {
			setIsArchivingMemory(false)
		}
	}

	async function handleEnableNotifications(): Promise<void> {
		setNotificationMessage(null)

		if (isCapacitorNativePlatform()) {
			const granted = await requestBackgroundReminderNotificationPermission()
			setNotificationPermission(granted ? 'granted' : 'denied')

			if (granted) {
				await syncBackgroundReminderNotifications(preferences)
				setNotificationMessage(
					'Notifications enabled. Scheduled reminders can alert you while the Android app is closed.',
				)
				return
			}

			setNotificationMessage(
				'Notifications are blocked. Enable them in Android settings for Gemini Chat.',
			)
			return
		}

		if (!canUseNotifications()) {
			setNotificationMessage('Notifications are not supported in this browser.')
			return
		}

		const permission = await requestNotificationPermission()
		setNotificationPermission(permission)

		if (permission === 'granted') {
			await syncBackgroundReminderNotifications(preferences)
			setNotificationMessage(
				canUseNotificationTriggers() && isStandaloneDisplayMode()
					? 'Notifications enabled. Chat replies and scheduled reminders can alert you while the app is closed on this Android install.'
					: 'Notifications enabled. You will get system alerts when a reply finishes in the background.',
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
			<header className="shrink-0 border-b border-border/80 px-4 py-3 md:px-6">
				<div className="library-section-tabs flex gap-1 overflow-x-auto rounded-xl p-1">
					{SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveTab(id)}
							className={cn(
								'inline-flex min-w-[4.5rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:text-sm',
								activeTab === id
									? 'surface-tab-active text-foreground'
									: 'text-muted-foreground hover:text-foreground',
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span className="truncate">{label}</span>
						</button>
					))}
				</div>
			</header>

			<ScrollArea className="min-h-0 flex-1">
				<div className="mx-auto w-full max-w-2xl px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-6">
					{activeTab === 'profile' ? (
						<ProfileTab
							userName={userName}
							aiName={aiName}
							aiBehaviorInstructions={aiBehaviorInstructions}
							allowMatureContent={allowMatureContent}
							savedIdentity={savedIdentity}
							isSavingIdentity={isSavingIdentity}
							onUserNameChange={(value) => {
								setUserName(value)
								setSavedIdentity(false)
							}}
							onAiNameChange={(value) => {
								setAiName(value)
								setSavedIdentity(false)
							}}
							onBehaviorChange={(value) => {
								setAiBehaviorInstructions(value)
								setSavedIdentity(false)
							}}
							onAllowMatureContentChange={(value) => {
								setAllowMatureContent(value)
								setSavedIdentity(false)
							}}
							onSave={() => void handleSaveIdentity()}
						/>
					) : null}

					{activeTab === 'memory' ? (
						<MemoryTab
							memoryArchiveInterval={memoryArchiveInterval}
							unarchivedMessageCount={
								conversation ? getUnarchivedMessages(conversation).length : 0
							}
							hasApiKey={preferences.geminiApiKey.trim().length > 0}
							isClearingMemory={isClearingMemory}
							isArchivingMemory={isArchivingMemory}
							actionMessage={memoryActionMessage}
							onIntervalChange={(value) => void handleMemoryIntervalChange(value)}
							onClearMemory={() => void handleClearMemory()}
							onManualArchive={() => void handleManualMemoryArchive()}
						/>
					) : null}

					{activeTab === 'api' ? (
						<ApiTab
							apiKey={apiKey}
							savedApiKey={savedApiKey}
							isSavingApiKey={isSavingApiKey}
							isValidating={isValidating}
							validationMessage={validationMessage}
							validationOk={validationOk}
							onApiKeyChange={(value) => {
								setApiKey(value)
								setSavedApiKey(false)
								setValidationMessage(null)
								setValidationOk(null)
							}}
							onSave={() => void handleSaveApiKey()}
							onValidate={() => void handleValidate()}
						/>
					) : null}

					{activeTab === 'voice' ? (
						<VoiceTab
							ttsReadAloudMode={ttsReadAloudMode}
							ttsVoiceName={ttsVoiceName}
							hasApiKey={preferences.geminiApiKey.trim().length > 0}
							speechStatus={speechStatus}
							onReadAloudModeChange={(value) =>
								void handleTtsReadAloudModeChange(value)
							}
							onVoiceChange={(value) => void handleTtsVoiceChange(value)}
							onPreview={() => void previewVoice(ttsVoiceName)}
						/>
					) : null}

					{activeTab === 'app' ? (
						<AppTab
							notificationPermission={notificationPermission}
							notificationMessage={notificationMessage}
							allowCodebaseInspection={allowCodebaseInspection}
							githubPat={githubPat}
							devStudioRepository={devStudioRepository}
							devStudioBranch={devStudioBranch}
							savedDevStudio={savedDevStudio}
							isSavingDevStudio={isSavingDevStudio}
							onGithubPatChange={setGithubPat}
							onDevStudioRepositoryChange={setDevStudioRepository}
							onDevStudioBranchChange={setDevStudioBranch}
							onSaveDevStudio={() => void handleSaveDevStudio()}
							onEnableNotifications={() => void handleEnableNotifications()}
							onAllowCodebaseInspectionChange={(value) =>
								void handleAllowCodebaseInspectionChange(value)
							}
						/>
					) : null}
				</div>
			</ScrollArea>
		</div>
	)
}

function ProfileTab({
	userName,
	aiName,
	aiBehaviorInstructions,
	allowMatureContent,
	savedIdentity,
	isSavingIdentity,
	onUserNameChange,
	onAiNameChange,
	onBehaviorChange,
	onAllowMatureContentChange,
	onSave,
}: {
	userName: string
	aiName: string
	aiBehaviorInstructions: string
	allowMatureContent: boolean
	savedIdentity: boolean
	isSavingIdentity: boolean
	onUserNameChange: (value: string) => void
	onAiNameChange: (value: string) => void
	onBehaviorChange: (value: string) => void
	onAllowMatureContentChange: (value: boolean) => void
	onSave: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Profile & personality"
				description="How you and your assistant are named, and how replies should feel."
			/>

			<section className="surface-panel space-y-5 rounded-xl p-5">
				<div className="grid gap-5 sm:grid-cols-2">
					<FieldGroup
						icon={UserRound}
						label="Your name"
						hint="What the assistant should call you."
					>
						<input
							value={userName}
							onChange={(event) => onUserNameChange(event.target.value)}
							placeholder="Your name"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</FieldGroup>

					<FieldGroup
						icon={Sparkles}
						label="AI name"
						hint="Shown in the app and sent to Gemini."
					>
						<input
							value={aiName}
							onChange={(event) => onAiNameChange(event.target.value)}
							placeholder="Assistant"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</FieldGroup>
				</div>

				<FieldGroup
					label="How should your AI respond?"
					hint='Traits like "Warm, witty, direct, British English" — or a longer custom prompt.'
				>
					<textarea
						value={aiBehaviorInstructions}
						onChange={(event) => onBehaviorChange(event.target.value)}
						rows={6}
						placeholder="Warm, conversational, witty, direct, British English"
						className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
					/>
				</FieldGroup>

				<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
					<input
						type="checkbox"
						checked={allowMatureContent}
						onChange={(event) => onAllowMatureContentChange(event.target.checked)}
						className="mt-0.5"
					/>
					<span>
						<span className="block font-medium">Allow mature content</span>
						<span className="mt-1 block text-muted-foreground">
							Matches your tone (including swearing), relaxes adjustable Gemini
							filters for chat, image, and music, and allows adult people in
							generated images. Illegal content is always blocked. Turn off for
							stricter filtering.
						</span>
					</span>
				</label>

				<div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
					<Button onClick={onSave} disabled={isSavingIdentity}>
						<Save className="h-4 w-4" />
						{isSavingIdentity ? 'Saving…' : 'Save profile'}
					</Button>
					{savedIdentity ? (
						<span className="text-sm text-primary">Profile saved</span>
					) : null}
				</div>
			</section>
		</div>
	)
}

function MemoryTab({
	memoryArchiveInterval,
	unarchivedMessageCount,
	hasApiKey,
	isClearingMemory,
	isArchivingMemory,
	actionMessage,
	onIntervalChange,
	onClearMemory,
	onManualArchive,
}: {
	memoryArchiveInterval: MemoryArchiveInterval
	unarchivedMessageCount: number
	hasApiKey: boolean
	isClearingMemory: boolean
	isArchivingMemory: boolean
	actionMessage: string | null
	onIntervalChange: (value: number) => void
	onClearMemory: () => void
	onManualArchive: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Memory"
				description="Control how often chat facts get archived for future conversations."
			/>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<p className="text-sm text-muted-foreground">
					After this many new chat messages, the assistant reads the batch and
					archives durable facts into Memory. Lower values update more often;
					higher values wait for more context per pass.
				</p>

				<div className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Archive every</span>
						<span className="font-medium">{memoryArchiveInterval} messages</span>
					</div>
					<input
						type="range"
						min={0}
						max={MEMORY_ARCHIVE_INTERVAL_OPTIONS.length - 1}
						step={1}
						value={Math.max(
							0,
							MEMORY_ARCHIVE_INTERVAL_OPTIONS.indexOf(memoryArchiveInterval),
						)}
						onChange={(event) => {
							const index = Number(event.target.value)
							const next = MEMORY_ARCHIVE_INTERVAL_OPTIONS[index] ?? 20
							onIntervalChange(next)
						}}
						className="w-full accent-primary"
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						{MEMORY_ARCHIVE_INTERVAL_OPTIONS.map((option) => (
							<span key={option}>{option}</span>
						))}
					</div>
				</div>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<h3 className="text-sm font-medium">Manual actions</h3>
				<p className="text-sm text-muted-foreground">
					{unarchivedMessageCount > 0
						? `${unarchivedMessageCount} chat message${unarchivedMessageCount === 1 ? '' : 's'} not yet scanned for memory.`
						: 'All chat messages have already been scanned.'}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onManualArchive}
						disabled={isArchivingMemory || !hasApiKey || unarchivedMessageCount === 0}
					>
						<RefreshCw
							className={cn('h-4 w-4', isArchivingMemory && 'animate-spin')}
						/>
						{isArchivingMemory ? 'Archiving…' : 'Archive now'}
					</Button>
					<Button
						type="button"
						variant="outline"
						className="text-destructive hover:text-destructive"
						onClick={onClearMemory}
						disabled={isClearingMemory}
					>
						<Trash2 className="h-4 w-4" />
						{isClearingMemory ? 'Clearing…' : 'Clear memory'}
					</Button>
				</div>
				{!hasApiKey ? (
					<p className="text-xs text-muted-foreground">
						Add a Gemini API key in the API tab to run manual archive.
					</p>
				) : null}
				{actionMessage ? (
					<p className="text-sm text-muted-foreground">{actionMessage}</p>
				) : null}
			</section>

			<section className="surface-panel rounded-xl p-5">
				<p className="text-sm text-muted-foreground">
					<Link
						to="/memory"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Open Memory
					</Link>{' '}
					to browse archived facts from chat.
				</p>
			</section>
		</div>
	)
}

function ApiTab({
	apiKey,
	savedApiKey,
	isSavingApiKey,
	isValidating,
	validationMessage,
	validationOk,
	onApiKeyChange,
	onSave,
	onValidate,
}: {
	apiKey: string
	savedApiKey: boolean
	isSavingApiKey: boolean
	isValidating: boolean
	validationMessage: string | null
	validationOk: boolean | null
	onApiKeyChange: (value: string) => void
	onSave: () => void
	onValidate: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="API & models"
				description="Your Gemini key stays on-device. Pick default models from the + menu in chat."
			/>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<FieldGroup
					icon={KeyRound}
					label="Gemini API key"
					hint={
						<>
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
						</>
					}
				>
					<input
						type="password"
						value={apiKey}
						onChange={(event) => onApiKeyChange(event.target.value)}
						placeholder="AIza..."
						autoComplete="off"
						className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
					/>
				</FieldGroup>

				<div className="flex flex-wrap items-center gap-3">
					<Button onClick={onSave} disabled={isSavingApiKey}>
						<Save className="h-4 w-4" />
						{isSavingApiKey ? 'Saving…' : 'Save key'}
					</Button>
					<Button
						variant="outline"
						onClick={onValidate}
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
							validationOk ? 'text-sm text-primary' : 'text-sm text-destructive'
						}
					>
						{validationMessage}
					</p>
				) : null}
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<h3 className="text-sm font-medium">Web search</h3>
				<p className="text-sm text-muted-foreground">
					Enable <span className="font-medium text-foreground">Web search</span>{' '}
					from the + menu in chat. Gemini 3 includes about 5,000 search queries
					per month free, then roughly $14 per 1,000 queries — billed per search
					the model runs, not per chat message.
				</p>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<h3 className="text-sm font-medium">Available models</h3>
				<p className="text-sm text-muted-foreground">
					Say &quot;generate an image of…&quot; or &quot;generate music&quot; and
					the app uses your chosen model for that type.
				</p>
				<div className="space-y-4">
					{(['chat', 'image', 'music'] as const).map((category) => (
						<div key={category}>
							<h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{MODEL_CATEGORY_LABELS[category]}
							</h4>
							<ul className="space-y-2">
								{GEMINI_MODELS.filter((model) => model.category === category).map(
									(model) => (
										<li
											key={model.id}
											className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm"
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
		</div>
	)
}

function VoiceTab({
	ttsReadAloudMode,
	ttsVoiceName,
	hasApiKey,
	speechStatus,
	onReadAloudModeChange,
	onVoiceChange,
	onPreview,
}: {
	ttsReadAloudMode: TtsReadAloudMode
	ttsVoiceName: string
	hasApiKey: boolean
	speechStatus: string
	onReadAloudModeChange: (value: TtsReadAloudMode) => void
	onVoiceChange: (value: string) => void
	onPreview: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Voice"
				description="Speech-to-text input and text-to-speech playback for assistant replies."
			/>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Mic className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Voice input</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					On desktop, the mic uses your browser&apos;s speech recognition. On
					Android and installed apps, it records a short clip and transcribes it
					with your default chat model and Gemini API key.
				</p>
				<p className="text-sm text-muted-foreground">
					Tap the mic, speak, then tap Continue. If voice input fails in an
					installed app, try opening the site in Chrome instead of the home-screen
					shortcut.
				</p>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Volume2 className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Voice output</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Gemini TTS reads replies aloud. Chat text is always shown — speech is
					optional on top.
				</p>

				<div className="space-y-2">
					<label htmlFor="tts-read-aloud-mode" className="text-sm font-medium">
						Read responses aloud
					</label>
					<select
						id="tts-read-aloud-mode"
						value={ttsReadAloudMode}
						onChange={(event) => {
							onReadAloudModeChange(event.target.value as TtsReadAloudMode)
						}}
						className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
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
							onChange={(event) => onVoiceChange(event.target.value)}
							className="min-w-0 flex-1 rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
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
								!hasApiKey ||
								speechStatus === 'loading' ||
								speechStatus === 'playing'
							}
							onClick={onPreview}
						>
							<Volume2 className="h-4 w-4" />
							{speechStatus === 'loading' ? 'Loading…' : 'Preview'}
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						Uses{' '}
						<span className="font-medium text-foreground">
							gemini-3.1-flash-tts-preview
						</span>{' '}
						with streaming playback. Tap Listen on a reply for manual playback.
					</p>
				</div>
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Mic className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Voice conversation</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					In chat, tap the phone icon next to your assistant&apos;s name for
					Conversation Mode. A short explanation appears before you start.
				</p>
			</section>
		</div>
	)
}

function AppTab({
	notificationPermission,
	notificationMessage,
	allowCodebaseInspection,
	githubPat,
	devStudioRepository,
	devStudioBranch,
	savedDevStudio,
	isSavingDevStudio,
	onGithubPatChange,
	onDevStudioRepositoryChange,
	onDevStudioBranchChange,
	onSaveDevStudio,
	onEnableNotifications,
	onAllowCodebaseInspectionChange,
}: {
	notificationPermission: NotificationPermission
	notificationMessage: string | null
	allowCodebaseInspection: boolean
	githubPat: string
	devStudioRepository: string
	devStudioBranch: string
	savedDevStudio: boolean
	isSavingDevStudio: boolean
	onGithubPatChange: (value: string) => void
	onDevStudioRepositoryChange: (value: string) => void
	onDevStudioBranchChange: (value: string) => void
	onSaveDevStudio: () => void
	onEnableNotifications: () => void
	onAllowCodebaseInspectionChange: (value: boolean) => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="App behaviour"
				description="Notifications, Dev Studio, and how chat behaves when you leave the screen."
			/>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Code2 className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Dev Studio (GitHub)</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Connect any repository for the mobile code agent. Your fine-grained
					Personal Access Token stays on this device in IndexedDB.
				</p>
				<label className="block space-y-2 text-sm">
					<span className="font-medium">GitHub token</span>
					<input
						type="password"
						value={githubPat}
						onChange={(event) => onGithubPatChange(event.target.value)}
						placeholder="github_pat_…"
						className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
						autoComplete="off"
					/>
				</label>
				<DevStudioRepositorySelect
					githubPat={githubPat}
					repository={devStudioRepository}
					branch={devStudioBranch}
					onRepositoryChange={onDevStudioRepositoryChange}
					onBranchChange={onDevStudioBranchChange}
				/>
				<div className="flex items-center gap-3">
					<Button type="button" onClick={onSaveDevStudio} disabled={isSavingDevStudio}>
						<Save className="h-4 w-4" />
						{isSavingDevStudio ? 'Saving…' : 'Save Dev Studio settings'}
					</Button>
					{savedDevStudio ? (
						<span className="text-sm text-primary">Saved</span>
					) : null}
				</div>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Bell className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">System notifications</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Get a phone notification when a chat reply finishes while you are in
					another app or browsing elsewhere in the PWA. Tap it to jump back to
					chat.
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
					<Button variant="outline" onClick={onEnableNotifications}>
						<Bell className="h-4 w-4" />
						Enable notifications
					</Button>
				) : null}
				{notificationMessage ? (
					<p className="text-sm text-muted-foreground">{notificationMessage}</p>
				) : null}
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<h3 className="text-sm font-medium">Scheduled reminders</h3>
				<p className="text-sm text-muted-foreground">
					Library → Schedule stores reminders on this device. When one is due,
					the assistant posts a chat message and can show a system notification.
				</p>
				<p className="text-sm text-muted-foreground">
					{isCapacitorNativePlatform()
						? notificationPermission === 'granted'
							? 'The Android app can fire reminder alerts while it is closed. Tap the notification to open chat and deliver the message.'
							: 'Enable notifications above so scheduled reminders can alert you while the app is closed.'
						: canUseNotificationTriggers() && isStandaloneDisplayMode()
							? notificationPermission === 'granted'
								? 'This Android install can fire reminder alerts while the PWA is closed. Tap the notification or reopen the app to deliver the chat message.'
								: 'Enable notifications above to schedule background reminder alerts on Android.'
							: 'For reliable background reminders, install the Android app (Capacitor). In the browser, keep the app open for on-time delivery.'}
				</p>
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<h3 className="text-sm font-medium">Background replies</h3>
				<p className="text-sm text-muted-foreground">
					Chat keeps generating if you switch tabs. You will see an in-app banner
					while a reply is in progress. With notifications enabled, Android also
					shows a system tray alert when the reply is ready.
				</p>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<RefreshCw className="h-5 w-5 text-primary" />
							<h3 className="text-sm font-medium">Changelog</h3>
						</div>
						<p className="text-sm text-muted-foreground">
							Current version:{' '}
							<span className="font-medium text-foreground">v{APP_VERSION}</span>
						</p>
					</div>
					<Button type="button" variant="outline" size="sm" onClick={downloadChangelogMarkdown}>
						<Download className="h-4 w-4" />
						Export changelog (.md)
					</Button>
				</div>
				<div className="max-h-[min(28rem,50vh)] space-y-3 overflow-y-auto overscroll-contain rounded-lg border border-border/60 p-3">
					{CHANGELOG.map((entry) => (
						<article
							key={entry.version}
							className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h4 className="text-sm font-medium">v{entry.version}</h4>
								<time
									className="text-xs text-muted-foreground"
									dateTime={entry.releasedAt}
								>
									{formatChangelogDate(entry.releasedAt)}
								</time>
							</div>
							<p className="mt-0.5 text-xs text-muted-foreground">{entry.summary}</p>
							<ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
								{entry.changes.map((change) => (
									<li key={change}>{change}</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Sparkles className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">App reference for the AI</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					A comprehensive markdown guide describing how this app works — architecture,
					storage, tools, pages, and constraints. It is injected into the assistant&apos;s
					context on every chat message so the AI always knows how itself and the app work.
				</p>
				<Button type="button" variant="outline" onClick={downloadAppReferenceMarkdown}>
					<Download className="h-4 w-4" />
					Download app reference (.md)
				</Button>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<h3 className="text-sm font-medium">Codebase inspection</h3>
				<p className="text-sm text-muted-foreground">
					When enabled, the assistant can use read-only tools to list, read, and search
					bundled source files when you ask how something is implemented. It cannot
					modify code — only inspect the version shipped with this app.
				</p>
				<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
					<input
						type="checkbox"
						checked={allowCodebaseInspection}
						onChange={(event) =>
							onAllowCodebaseInspectionChange(event.target.checked)
						}
						className="mt-0.5"
					/>
					<span>
						<span className="block font-medium">Allow AI to inspect source code</span>
						<span className="mt-1 block text-muted-foreground">
							Ask in chat: &quot;How does document autosave work?&quot; or
							&quot;Show me the reminder scheduler code.&quot;
						</span>
					</span>
				</label>
			</section>
		</div>
	)
}

function TabIntro({
	title,
	description,
}: {
	title: string
	description: string
}) {
	return (
		<div>
			<h2 className="text-lg font-semibold">{title}</h2>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
	)
}

function FieldGroup({
	icon: Icon,
	label,
	hint,
	children,
}: {
	icon?: typeof UserRound
	label: string
	hint?: ReactNode
	children: ReactNode
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				{Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
				<label className="text-sm font-medium">{label}</label>
			</div>
			{hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
			{children}
		</div>
	)
}
