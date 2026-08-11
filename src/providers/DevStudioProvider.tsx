import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	fetchRepositoryTree,
	listAccessibleRepositories,
	listOpenPullRequests,
	type GitHubRateLimit,
	type GitHubRepositorySummary,
	GitHubApiError,
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
import {
	mergeRepositoryOptions,
	sleep,
} from '@/utils/devStudioRepositories'

interface DevStudioContextValue {
	isConfigured: boolean
	repositorySlug: string
	branch: string
	connectionStatus: DevStudioConnectionStatus
	connectionError: string | null
	rateLimit: GitHubRateLimit | null
	workspace: DevStudioWorkspaceSnapshot | null
	repositoryOptions: GitHubRepositorySummary[]
	isLoadingRepositories: boolean
	repositoryListError: string | null
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
	loadRepositories: (options?: { retries?: number }) => Promise<void>
	registerRepository: (repository: GitHubRepositorySummary) => void
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
	const [remoteRepositories, setRemoteRepositories] = useState<
		GitHubRepositorySummary[]
	>([])
	const [pinnedRepositories, setPinnedRepositories] = useState<
		GitHubRepositorySummary[]
	>([])
	const [isLoadingRepositories, setIsLoadingRepositories] = useState(false)
	const [repositoryListError, setRepositoryListError] = useState<string | null>(
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
		preferences.githubPat.trim().length > 0 && repoRef !== null

	const repositorySlug = repoRef ? formatRepositorySlug(repoRef) : ''
	const branch = repoRef?.branch ?? 'main'

	const repositoryOptions = useMemo(
		() =>
			mergeRepositoryOptions(
				remoteRepositories,
				pinnedRepositories,
				repositorySlug,
				branch,
			),
		[branch, pinnedRepositories, remoteRepositories, repositorySlug],
	)

	const loadRepositories = useCallback(
		async (options?: { retries?: number }) => {
			const token = preferences.githubPat.trim()
			if (!token) {
				setRemoteRepositories([])
				setRepositoryListError('GitHub token required.')
				return
			}

			const attempts = Math.max(1, options?.retries ?? 1)
			setIsLoadingRepositories(true)
			setRepositoryListError(null)

			for (let attempt = 0; attempt < attempts; attempt += 1) {
				try {
					const result = await listAccessibleRepositories(token)
					setRemoteRepositories(result.repositories)
					if (result.repositories.length === 0) {
						setRepositoryListError('No repositories found for this token.')
					}
					setIsLoadingRepositories(false)
					return
				} catch (caught) {
					if (attempt < attempts - 1) {
						await sleep(1200)
						continue
					}

					setRemoteRepositories([])
					setRepositoryListError(
						caught instanceof Error
							? caught.message
							: 'Could not load repositories.',
					)
				}
			}

			setIsLoadingRepositories(false)
		},
		[preferences.githubPat],
	)

	const registerRepository = useCallback((repository: GitHubRepositorySummary) => {
		setPinnedRepositories((current) => {
			if (current.some((repo) => repo.fullName === repository.fullName)) {
				return current
			}
			return [...current, repository]
		})
	}, [])

	useEffect(() => {
		if (preferences.githubPat.trim()) {
			void loadRepositories()
		} else {
			setRemoteRepositories([])
			setPinnedRepositories([])
		}
	}, [loadRepositories, preferences.githubPat])

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
				let tree: DevStudioWorkspaceSnapshot['tree'] = []
				let latestRateLimit: GitHubRateLimit | null = null
				let emptyRepoNotice: string | null = null

				try {
					const treeResult = await fetchRepositoryTree(token, activeRepo)
					tree = treeResult.tree
					latestRateLimit = treeResult.rateLimit
				} catch (caught) {
					if (caught instanceof GitHubApiError && caught.status === 404) {
						emptyRepoNotice =
							'Repository is empty or the branch has no commits yet. Enable “Initialize with README” when creating, or push a first commit on GitHub.'
					} else {
						throw caught
					}
				}

				const pullResult = await listOpenPullRequests(token, activeRepo)
				latestRateLimit = pullResult.rateLimit ?? latestRateLimit

				setRateLimit(latestRateLimit)
				setWorkspace({
					repo: activeRepo,
					tree,
					pullRequests: pullResult.pullRequests,
					lastSyncedAt: Date.now(),
				})
				setConnectionStatus('connected')
				setConnectionError(emptyRepoNotice)
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
		await Promise.all([loadRepositories(), hydrateWorkspace()])
	}, [hydrateWorkspace, loadRepositories])

	const switchRepository = useCallback(
		async (fullName: string, defaultBranch?: string) => {
			const parsed = parseRepositorySlug(fullName)
			if (!parsed) {
				setConnectionError('Invalid repository format.')
				return
			}

			const branchName =
				defaultBranch?.trim() || preferences.devStudioBranch || 'main'
			const nextRepo: DevStudioRepoRef = {
				...parsed,
				branch: branchName,
			}

			registerRepository({
				fullName,
				defaultBranch: branchName,
				isPrivate: true,
				updatedAt: new Date().toISOString(),
			})

			await savePreferences({
				...preferences,
				devStudioRepository: fullName,
				devStudioBranch: branchName,
			})
			await hydrateWorkspace(nextRepo)
		},
		[hydrateWorkspace, preferences, registerRepository, savePreferences],
	)

	const appendMessage = useCallback((message: StoredMessage) => {
		setMessages((current) => [...current, message])
	}, [])

	const discardStagedChange = useCallback((id: string) => {
		setStagedChanges((current) => current.filter((change) => change.id !== id))
	}, [])

	const value = useMemo(
		(): DevStudioContextValue => ({
			isConfigured,
			repositorySlug,
			branch,
			connectionStatus,
			connectionError,
			rateLimit,
			workspace,
			repositoryOptions,
			isLoadingRepositories,
			repositoryListError,
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
			loadRepositories,
			registerRepository,
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
			isLoadingRepositories,
			loadRepositories,
			messages,
			mobileTab,
			rateLimit,
			refreshWorkspace,
			registerRepository,
			repositoryListError,
			repositoryOptions,
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
