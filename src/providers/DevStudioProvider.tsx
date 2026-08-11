import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	fetchRepositoryTree,
	listOpenPullRequests,
	type GitHubRateLimit,
} from '@/services/github/githubApiService'
import type { StoredMessage } from '@/storage/types'
import {
	formatRepositorySlug,
	parseRepositorySlug,
	type DevStudioConnectionStatus,
	type DevStudioContextTab,
	type DevStudioMobileTab,
	type DevStudioRepoRef,
	type DevStudioStagedChange,
	type DevStudioWorkspaceSnapshot,
} from '@/types/devStudio'

interface DevStudioContextValue {
	isConfigured: boolean
	repositorySlug: string
	branch: string
	connectionStatus: DevStudioConnectionStatus
	connectionError: string | null
	rateLimit: GitHubRateLimit | null
	workspace: DevStudioWorkspaceSnapshot | null
	contextTab: DevStudioContextTab
	mobileTab: DevStudioMobileTab
	selectedFilePath: string | null
	stagedChanges: DevStudioStagedChange[]
	messages: StoredMessage[]
	isComposerSending: boolean
	setContextTab: (tab: DevStudioContextTab) => void
	setMobileTab: (tab: DevStudioMobileTab) => void
	setSelectedFilePath: (path: string | null) => void
	connectWorkspace: () => Promise<void>
	refreshWorkspace: () => Promise<void>
	switchRepository: (fullName: string, defaultBranch?: string) => Promise<void>
	appendMessage: (message: StoredMessage) => void
	setComposerSending: (value: boolean) => void
	discardStagedChange: (id: string) => void
}

const DevStudioContext = createContext<DevStudioContextValue | null>(null)

const SCAFFOLD_STAGED_CHANGES: DevStudioStagedChange[] = [
	{
		id: 'scaffold-1',
		path: 'src/services/example/feature.ts',
		status: 'modified',
		oldContent: 'export function greet(name: string) {\n\treturn `Hello ${name}`\n}\n',
		newContent:
			'export function greet(name: string) {\n\treturn `Hello, ${name}!`\n}\n',
	},
]

function buildRepoRef(
	repository: string,
	branch: string,
): DevStudioRepoRef | null {
	const parsed = parseRepositorySlug(repository)
	if (!parsed) {
		return null
	}

	return {
		...parsed,
		branch: branch.trim() || 'main',
	}
}

export function DevStudioProvider({ children }: { children: ReactNode }) {
	const { preferences, savePreferences } = usePreferencesContext()
	const [connectionStatus, setConnectionStatus] =
		useState<DevStudioConnectionStatus>('disconnected')
	const [connectionError, setConnectionError] = useState<string | null>(null)
	const [rateLimit, setRateLimit] = useState<GitHubRateLimit | null>(null)
	const [workspace, setWorkspace] = useState<DevStudioWorkspaceSnapshot | null>(
		null,
	)
	const [contextTab, setContextTab] = useState<DevStudioContextTab>('files')
	const [mobileTab, setMobileTab] = useState<DevStudioMobileTab>('chat')
	const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
	const [stagedChanges, setStagedChanges] =
		useState<DevStudioStagedChange[]>(SCAFFOLD_STAGED_CHANGES)
	const [messages, setMessages] = useState<StoredMessage[]>([
		{
			id: 'dev-studio-welcome',
			role: 'assistant',
			content:
				'Dev Studio is ready. Connect a GitHub repo in Settings, then ask me to inspect files or propose changes. Staged edits appear in Diff before anything is pushed.',
			createdAt: Date.now(),
		},
	])
	const [isComposerSending, setComposerSending] = useState(false)

	const repoRef = useMemo(
		() =>
			buildRepoRef(
				preferences.devStudioRepository,
				preferences.devStudioBranch,
			),
		[preferences.devStudioBranch, preferences.devStudioRepository],
	)

	const isConfigured =
		preferences.githubPat.trim().length > 0 &&
		repoRef !== null

	const repositorySlug = repoRef ? formatRepositorySlug(repoRef) : ''

	const hydrateWorkspace = useCallback(
		async (repoOverride?: DevStudioRepoRef) => {
			const activeRepo = repoOverride ?? repoRef
			if (!activeRepo || !preferences.githubPat.trim()) {
				setConnectionStatus('disconnected')
				setWorkspace(null)
				setConnectionError(null)
				return
			}

			setConnectionStatus('connecting')
			setConnectionError(null)
			setSelectedFilePath(null)

			try {
				const token = preferences.githubPat.trim()
				const [treeResult, pullResult] = await Promise.all([
					fetchRepositoryTree(token, activeRepo),
					listOpenPullRequests(token, activeRepo),
				])

				setRateLimit(pullResult.rateLimit ?? treeResult.rateLimit)
				setWorkspace({
					repo: activeRepo,
					tree: treeResult.tree,
					pullRequests: pullResult.pullRequests,
					lastSyncedAt: Date.now(),
				})
				setConnectionStatus('connected')
			} catch (caught) {
				setConnectionStatus('error')
				setWorkspace(null)
				setConnectionError(
					caught instanceof Error
						? caught.message
						: 'Could not connect to GitHub.',
				)
			}
		},
		[preferences.githubPat, repoRef],
	)

	const connectWorkspace = useCallback(async () => {
		await hydrateWorkspace()
	}, [hydrateWorkspace])

	const refreshWorkspace = useCallback(async () => {
		await hydrateWorkspace()
	}, [hydrateWorkspace])

	const switchRepository = useCallback(
		async (fullName: string, defaultBranch?: string) => {
			const parsed = parseRepositorySlug(fullName)
			if (!parsed) {
				setConnectionError('Invalid repository format.')
				return
			}

			const branch = defaultBranch?.trim() || preferences.devStudioBranch || 'main'
			const nextRepo: DevStudioRepoRef = {
				...parsed,
				branch,
			}

			await savePreferences({
				...preferences,
				devStudioRepository: fullName,
				devStudioBranch: branch,
			})
			await hydrateWorkspace(nextRepo)
		},
		[hydrateWorkspace, preferences, savePreferences],
	)

	const appendMessage = useCallback((message: StoredMessage) => {
		setMessages((current) => [...current, message])
	}, [])

	const discardStagedChange = useCallback((id: string) => {
		setStagedChanges((current) => current.filter((change) => change.id !== id))
	}, [])

	const branch = repoRef?.branch ?? 'main'

	const value = useMemo(
		(): DevStudioContextValue => ({
			isConfigured,
			repositorySlug,
			branch,
			connectionStatus,
			connectionError,
			rateLimit,
			workspace,
			contextTab,
			mobileTab,
			selectedFilePath,
			stagedChanges,
			messages,
			isComposerSending,
			setContextTab,
			setMobileTab,
			setSelectedFilePath,
			connectWorkspace,
			refreshWorkspace,
			switchRepository,
			appendMessage,
			setComposerSending,
			discardStagedChange,
		}),
		[
			appendMessage,
			branch,
			connectWorkspace,
			connectionError,
			connectionStatus,
			contextTab,
			discardStagedChange,
			isComposerSending,
			isConfigured,
			messages,
			mobileTab,
			rateLimit,
			refreshWorkspace,
			repositorySlug,
			selectedFilePath,
			stagedChanges,
			switchRepository,
			workspace,
		],
	)

	return (
		<DevStudioContext.Provider value={value}>
			{children}
		</DevStudioContext.Provider>
	)
}

export function useDevStudio(): DevStudioContextValue {
	const context = useContext(DevStudioContext)
	if (!context) {
		throw new Error('useDevStudio must be used within DevStudioProvider')
	}
	return context
}
