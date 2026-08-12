import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from 'react'
import { usePreferencesContext } from '@/providers/ChatProvider'
import type { DevStudioToolContext } from '@/services/devStudio/devStudioWorkspaceTools'
import {
	loadPersistedWorkspace,
	savePersistedWorkspace,
} from '@/services/devStudio/devStudioWorkspaceStore'
import {
	closePullRequest,
	fetchFileContent,
	fetchRepositoryTree,
	getPagesDeploymentStatus,
	listAccessibleRepositories,
	listOpenPullRequests,
	mergePullRequest,
	pushStagedChangesAndOpenPullRequest,
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
	type DevStudioMergedPullRequest,
	type DevStudioOpenFile,
	type DevStudioPushResult,
	type DevStudioRepoRef,
	type DevStudioStagedChange,
	type DevStudioStreamingState,
	type DevStudioAgentTaskStatus,
	type DevStudioWorkspaceSnapshot,
	type GitHubPagesDeploymentInfo,
} from '@/types/devStudio'
import { getDevStudioPushSafety } from '@/utils/devStudioTaskStatus'
import { flattenFilePaths } from '@/utils/devStudioFileTree'
import { generateDevStudioPushMetadata } from '@/utils/devStudioPushMetadata'
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
	filePaths: string[]
	repositoryOptions: GitHubRepositorySummary[]
	isLoadingRepositories: boolean
	repositoryListError: string | null
	contextTab: DevStudioContextTab
	mobileTab: DevStudioMobileTab
	openFile: DevStudioOpenFile | null
	stagedChanges: DevStudioStagedChange[]
	messages: StoredMessage[]
	isComposerSending: boolean
	isPushing: boolean
	lastPushResult: DevStudioPushResult | null
	recentlyMergedPullRequests: DevStudioMergedPullRequest[]
	agentTaskStatus: DevStudioAgentTaskStatus
	streamingAssistant: DevStudioStreamingState | null
	pagesDeployment: GitHubPagesDeploymentInfo | null
	isPollingPagesStatus: boolean
	refreshPagesStatus: () => Promise<void>
	startPagesPolling: (durationMs?: number, intervalMs?: number) => void
	setContextTab: (tab: DevStudioContextTab) => void
	setMobileTab: (tab: DevStudioMobileTab) => void
	connectWorkspace: () => Promise<void>
	refreshWorkspace: () => Promise<void>
	switchRepository: (fullName: string, defaultBranch?: string) => Promise<void>
	loadRepositories: (options?: { retries?: number }) => Promise<void>
	registerRepository: (repository: GitHubRepositorySummary) => void
	openWorkspaceFile: (path: string) => Promise<void>
	updateOpenFileContent: (content: string) => void
	stageOpenFile: () => Promise<void>
	closeOpenFile: () => void
	stageChange: (change: Omit<DevStudioStagedChange, 'id'>) => Promise<void>
	discardStagedChange: (id: string) => void
	discardAllStagedChanges: () => void
	pushStagedChanges: (
		commitMessage?: string,
		pullRequestTitle?: string,
	) => Promise<DevStudioPushResult>
	mergePullRequestByNumber: (
		pullNumber: number,
		mergeMethod?: 'merge' | 'squash' | 'rebase',
	) => Promise<void>
	closePullRequestByNumber: (pullNumber: number) => Promise<void>
	appendMessage: (message: StoredMessage) => void
	setComposerSending: (value: boolean) => void
	setAgentTaskStatus: (status: DevStudioAgentTaskStatus) => void
	setStreamingAssistant: Dispatch<SetStateAction<DevStudioStreamingState | null>>
	buildToolContext: () => DevStudioToolContext | null
}

const DevStudioContext = createContext<DevStudioContextValue | null>(null)

const WELCOME_MESSAGE: StoredMessage = {
	id: 'dev-studio-welcome',
	role: 'assistant',
	content:
		'Dev Studio is connected. Open a file to edit in the IDE, ask me to inspect or change code, then review staged edits in Diff before pushing a branch and PR.',
	createdAt: Date.now(),
}

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

function createBranchName(): string {
	const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
	return `dev-studio/${stamp}`
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
	const [openFile, setOpenFile] = useState<DevStudioOpenFile | null>(null)
	const [stagedChanges, setStagedChanges] = useState<DevStudioStagedChange[]>([])
	const [fileShaByPath, setFileShaByPath] = useState<Record<string, string>>({})
	const [messages, setMessages] = useState<StoredMessage[]>([WELCOME_MESSAGE])
	const [isComposerSending, setComposerSending] = useState(false)
	const [isPushing, setIsPushing] = useState(false)
	const [lastPushResult, setLastPushResult] = useState<DevStudioPushResult | null>(
		null,
	)
	const [recentlyMergedPullRequests, setRecentlyMergedPullRequests] = useState<
		DevStudioMergedPullRequest[]
	>([])
	const [agentTaskStatus, setAgentTaskStatus] =
		useState<DevStudioAgentTaskStatus>('idle')
	const [streamingAssistant, setStreamingAssistant] =
		useState<DevStudioStreamingState | null>(null)

	const [pagesDeployment, setPagesDeployment] =
		useState<GitHubPagesDeploymentInfo | null>(null)
	const [isPollingPagesStatus, setIsPollingPagesStatus] = useState(false)
	const pollingTimerRef = useRef<number | null>(null)
	const pollingEndTimeRef = useRef<number | null>(null)

	const fileShaRef = useRef(fileShaByPath)
	const stagedRef = useRef(stagedChanges)
	const messagesRef = useRef(messages)

	useEffect(() => {
		fileShaRef.current = fileShaByPath
	}, [fileShaByPath])
	useEffect(() => {
		stagedRef.current = stagedChanges
	}, [stagedChanges])
	useEffect(() => {
		messagesRef.current = messages
	}, [messages])

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

	const filePaths = useMemo(
		() => (workspace ? flattenFilePaths(workspace.tree) : []),
		[workspace],
	)

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

	const stopPagesPolling = useCallback(() => {
		if (pollingTimerRef.current !== null) {
			window.clearInterval(pollingTimerRef.current)
			pollingTimerRef.current = null
		}
		setIsPollingPagesStatus(false)
	}, [])

	const refreshPagesStatus = useCallback(async () => {
		if (!repoRef || !preferences.githubPat.trim()) {
			setPagesDeployment(null)
			return
		}

		try {
			const result = await getPagesDeploymentStatus(
				preferences.githubPat.trim(),
				repoRef,
			)
			if (result.rateLimit) {
				setRateLimit(result.rateLimit)
			}
			setPagesDeployment(result.deployment)
		} catch {
			// Ignore pages fetch errors gracefully
		}
	}, [preferences.githubPat, repoRef])

	const startPagesPolling = useCallback(
		(durationMs = 180000, intervalMs = 12000) => {
			stopPagesPolling()
			setIsPollingPagesStatus(true)
			pollingEndTimeRef.current = Date.now() + durationMs

			void refreshPagesStatus()

			pollingTimerRef.current = window.setInterval(async () => {
				if (Date.now() >= (pollingEndTimeRef.current ?? 0)) {
					stopPagesPolling()
					return
				}

				try {
					if (!repoRef || !preferences.githubPat.trim()) {
						stopPagesPolling()
						return
					}
					const result = await getPagesDeploymentStatus(
						preferences.githubPat.trim(),
						repoRef,
					)
					if (result.rateLimit) {
						setRateLimit(result.rateLimit)
					}
					setPagesDeployment(result.deployment)

					if (
						result.deployment &&
						(result.deployment.state === 'deployed' ||
							result.deployment.state === 'failed')
					) {
						stopPagesPolling()
					}
				} catch {
					// Continue polling
				}
			}, intervalMs)
		},
		[preferences.githubPat, refreshPagesStatus, repoRef, stopPagesPolling],
	)

	useEffect(() => {
		return () => {
			stopPagesPolling()
		}
	}, [stopPagesPolling])

	const persistWorkspaceState = useCallback(
		async (repo: DevStudioRepoRef) => {
			await savePersistedWorkspace(repo, {
				stagedChanges: stagedRef.current,
				fileShaByPath: fileShaRef.current,
				messages: messagesRef.current.map((message) => ({
					id: message.id,
					role: message.role,
					content: message.content,
					createdAt: message.createdAt,
				})),
			})
		},
		[],
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

	useEffect(() => {
		if (!repoRef) {
			return
		}
		const timer = window.setTimeout(() => {
			void persistWorkspaceState(repoRef)
		}, 400)
		return () => window.clearTimeout(timer)
	}, [fileShaByPath, messages, persistWorkspaceState, repoRef, stagedChanges])

	const hydrateWorkspace = useCallback(
		async (repoOverride?: DevStudioRepoRef) => {
			const activeRepo = repoOverride ?? repoRef
			if (!activeRepo || !preferences.githubPat.trim()) {
				setConnectionStatus('disconnected')
				setWorkspace(null)
				setConnectionError(null)
				setPagesDeployment(null)
				return
			}

			setConnectionStatus('connecting')
			setConnectionError(null)
			setOpenFile(null)

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
							'Repository is empty or the branch has no commits yet. Enable â€œInitialize with READMEâ€  when creating, or push a first commit on GitHub.'
					} else {
						throw caught
					}
				}

				const pullResult = await listOpenPullRequests(token, activeRepo)
				latestRateLimit = pullResult.rateLimit ?? latestRateLimit

				const persisted = await loadPersistedWorkspace(activeRepo)
				if (persisted) {
					setStagedChanges(persisted.stagedChanges)
					setFileShaByPath(persisted.fileShaByPath)
					if (persisted.messages.length > 0) {
						setMessages(
							persisted.messages.map((message) => ({
								...message,
								role: message.role,
							})),
						)
					}
				} else {
					setStagedChanges([])
					setFileShaByPath({})
					setMessages([WELCOME_MESSAGE])
				}

				setRateLimit(latestRateLimit)
				setWorkspace({
					repo: activeRepo,
					tree,
					pullRequests: pullResult.pullRequests,
					lastSyncedAt: Date.now(),
				})
				setConnectionStatus('connected')
				setConnectionError(emptyRepoNotice)
				void refreshPagesStatus()
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
		[preferences.githubPat, refreshPagesStatus, repoRef],
	)

	const connectWorkspace = useCallback(async () => {
		await hydrateWorkspace()
	}, [hydrateWorkspace])

	const refreshWorkspace = useCallback(async () => {
		await Promise.all([
			loadRepositories(),
			hydrateWorkspace(),
			refreshPagesStatus(),
		])
	}, [hydrateWorkspace, loadRepositories, refreshPagesStatus])

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
			setLastPushResult(null)
			setRecentlyMergedPullRequests([])
			setAgentTaskStatus('idle')
			await hydrateWorkspace(nextRepo)
		},
		[hydrateWorkspace, preferences, registerRepository, savePreferences],
	)

	const stageChange = useCallback(
		async (change: Omit<DevStudioStagedChange, 'id'>) => {
			setStagedChanges((current) => {
				const existingIndex = current.findIndex(
					(item) => item.path === change.path,
				)
				const nextChange: DevStudioStagedChange = {
					...change,
					id:
						existingIndex >= 0
							? current[existingIndex].id
							: crypto.randomUUID(),
				}

				if (change.oldContent === change.newContent && change.status !== 'deleted') {
					return current.filter((item) => item.path !== change.path)
				}

				if (existingIndex >= 0) {
					const next = [...current]
					next[existingIndex] = nextChange
					return next
				}

				return [...current, nextChange]
			})
			if (change.source === 'user') {
				setMobileTab('diff')
				setContextTab('changes')
			}
		},
		[],
	)

	const openWorkspaceFile = useCallback(
		async (path: string) => {
			if (!repoRef || !preferences.githubPat.trim()) {
				return
			}

			setOpenFile({
				path,
				content: '',
				originalContent: '',
				isDirty: false,
				isLoading: true,
				error: null,
			})
			setContextTab('editor')
			setMobileTab('editor')

			try {
				const result = await fetchFileContent(
					preferences.githubPat.trim(),
					repoRef,
					path,
				)
				setFileShaByPath((current) => ({ ...current, [path]: result.sha }))
				setRateLimit((current) => result.rateLimit ?? current)
				setOpenFile({
					path,
					content: result.content,
					originalContent: result.content,
					sha: result.sha,
					isDirty: false,
					isLoading: false,
					error: null,
				})
			} catch (caught) {
				setOpenFile({
					path,
					content: '',
					originalContent: '',
					isDirty: false,
					isLoading: false,
					error:
						caught instanceof Error ? caught.message : 'Could not open file.',
				})
			}
		},
		[preferences.githubPat, repoRef],
	)

	const updateOpenFileContent = useCallback((content: string) => {
		setOpenFile((current) => {
			if (!current) {
				return current
			}
			return {
				...current,
				content,
				isDirty: content !== current.originalContent,
			}
		})
	}, [])

	const stageOpenFile = useCallback(async () => {
		if (!openFile || openFile.isLoading) {
			return
		}

		const exists = filePaths.includes(openFile.path)
		await stageChange({
			path: openFile.path,
			status: exists ? 'modified' : 'added',
			oldContent: openFile.originalContent,
			newContent: openFile.content,
			source: 'user',
			baseSha: openFile.sha ?? fileShaRef.current[openFile.path],
		})

		setOpenFile((current) =>
			current
				? {
						...current,
						originalContent: current.content,
						isDirty: false,
					}
				: current,
		)
	}, [filePaths, openFile, stageChange])

	const closeOpenFile = useCallback(() => {
		setOpenFile(null)
	}, [])

	const discardStagedChange = useCallback((id: string) => {
		setStagedChanges((current) => {
			const next = current.filter((change) => change.id !== id)
			if (next.length === 0) {
				setAgentTaskStatus('idle')
			}
			return next
		})
	}, [])

	const discardAllStagedChanges = useCallback(() => {
		setStagedChanges([])
		setAgentTaskStatus('idle')
	}, [])

	const pushStagedChanges = useCallback(
		async (commitMessage?: string, pullRequestTitle?: string) => {
			if (!repoRef || !preferences.githubPat.trim()) {
				throw new Error('Connect a repository first.')
			}
			if (stagedRef.current.length === 0) {
				throw new Error('No staged changes to push.')
			}

			const pushSafety = getDevStudioPushSafety(
				agentTaskStatus,
				stagedRef.current,
			)
			if (!pushSafety.allowed) {
				throw new Error(pushSafety.reason ?? 'Cannot push staged changes yet.')
			}

			const metadata = generateDevStudioPushMetadata(stagedRef.current, {
				commitMessage,
				pullRequestTitle,
			})

			setIsPushing(true)
			try {
				const branchName = createBranchName()
				const pushResult = await pushStagedChangesAndOpenPullRequest(
					preferences.githubPat.trim(),
					repoRef,
					{
						baseBranch: repoRef.branch,
						branchName,
						commitMessage: metadata.commitMessage,
						pullRequestTitle: metadata.pullRequestTitle,
						pullRequestBody: metadata.pullRequestBody,
						changes: stagedRef.current.map((change) => ({
							path: change.path,
							status: change.status,
							content: change.newContent,
						})),
					},
				)

				setRateLimit((current) => pushResult.rateLimit ?? current)
				setLastPushResult(pushResult.result)
				setStagedChanges([])
				setAgentTaskStatus('idle')
				setOpenFile(null)
				await hydrateWorkspace()
				setContextTab('git')
				setMobileTab('git')
				startPagesPolling()
				return pushResult.result
			} finally {
				setIsPushing(false)
			}
		},
		[
			agentTaskStatus,
			hydrateWorkspace,
			preferences.githubPat,
			repoRef,
			startPagesPolling,
		],
	)

	const mergePullRequestByNumber = useCallback(
		async (
			pullNumber: number,
			mergeMethod?: 'merge' | 'squash' | 'rebase',
		) => {
			if (!repoRef || !preferences.githubPat.trim()) {
				throw new Error('Connect a repository first.')
			}

			const pull = workspace?.pullRequests.find(
				(candidate) => candidate.number === pullNumber,
			)

			const result = await mergePullRequest(
				preferences.githubPat.trim(),
				repoRef,
				pullNumber,
				{ mergeMethod },
			)
			setRateLimit((current) => result.rateLimit ?? current)
			if (!result.merged) {
				throw new Error(result.message ?? 'Pull request could not be merged.')
			}

			setRecentlyMergedPullRequests((current) => {
				const mergedEntry: DevStudioMergedPullRequest = pull
					? {
							number: pull.number,
							title: pull.title,
							headRef: pull.headRef,
							baseRef: pull.baseRef,
							mergedAt: Date.now(),
						}
					: {
							number: pullNumber,
							title: `PR #${pullNumber}`,
							headRef: 'unknown',
							baseRef: repoRef.branch,
							mergedAt: Date.now(),
						}

				return [
					mergedEntry,
					...current.filter((entry) => entry.number !== pullNumber),
				]
			})
			await hydrateWorkspace()
			startPagesPolling()
		},
		[
			hydrateWorkspace,
			preferences.githubPat,
			repoRef,
			startPagesPolling,
			workspace?.pullRequests,
		],
	)

	const closePullRequestByNumber = useCallback(
		async (pullNumber: number) => {
			if (!repoRef || !preferences.githubPat.trim()) {
				throw new Error('Connect a repository first.')
			}

			const result = await closePullRequest(
				preferences.githubPat.trim(),
				repoRef,
				pullNumber,
			)
			setRateLimit((current) => result.rateLimit ?? current)
			await hydrateWorkspace()
		},
		[hydrateWorkspace, preferences.githubPat, repoRef],
	)

	const appendMessage = useCallback((message: StoredMessage) => {
		setMessages((current) => [...current, message])
	}, [])

	const buildToolContext = useCallback((): DevStudioToolContext | null => {
		if (!repoRef || !preferences.githubPat.trim()) {
			return null
		}

		return {
			token: preferences.githubPat.trim(),
			repo: repoRef,
			filePaths,
			pullRequests: workspace?.pullRequests ?? [],
			getStagedChanges: () => stagedRef.current,
			stageChange,
			pushStagedChanges,
			mergePullRequest: async (pullNumber, mergeMethod) => {
				const result = await mergePullRequest(
					preferences.githubPat.trim(),
					repoRef,
					pullNumber,
					{ mergeMethod },
				)
				if (result.rateLimit) {
					setRateLimit(result.rateLimit)
				}
				if (!result.merged) {
					throw new Error(result.message ?? 'Pull request could not be merged.')
				}
				return result
			},
			closePullRequest: async (pullNumber) => {
				const result = await closePullRequest(
					preferences.githubPat.trim(),
					repoRef,
					pullNumber,
				)
				if (result.rateLimit) {
					setRateLimit(result.rateLimit)
				}
			},
			refreshWorkspace: hydrateWorkspace,
			getCachedSha: (path) => fileShaRef.current[path],
			setCachedSha: (path, sha) => {
				setFileShaByPath((current) => ({ ...current, [path]: sha }))
			},
			onRateLimit: (next) => {
				if (next) {
					setRateLimit(next)
				}
			},
		}
	}, [
		filePaths,
		hydrateWorkspace,
		preferences.githubPat,
		pushStagedChanges,
		repoRef,
		stageChange,
		workspace?.pullRequests,
	])

	const value = useMemo(
		(): DevStudioContextValue => ({
			isConfigured,
			repositorySlug,
			branch,
			connectionStatus,
			connectionError,
			rateLimit,
			workspace,
			filePaths,
			repositoryOptions,
			isLoadingRepositories,
			repositoryListError,
			contextTab,
			mobileTab,
			openFile,
			stagedChanges,
			messages,
			isComposerSending,
			isPushing,
			lastPushResult,
			recentlyMergedPullRequests,
			agentTaskStatus,
			streamingAssistant,
			pagesDeployment,
			isPollingPagesStatus,
			refreshPagesStatus,
			startPagesPolling,
			setContextTab,
			setMobileTab,
			connectWorkspace,
			refreshWorkspace,
			switchRepository,
			loadRepositories,
			registerRepository,
			openWorkspaceFile,
			updateOpenFileContent,
			stageOpenFile,
			closeOpenFile,
			stageChange,
			discardStagedChange,
			discardAllStagedChanges,
			pushStagedChanges,
			mergePullRequestByNumber,
			closePullRequestByNumber,
			appendMessage,
			setComposerSending,
			setAgentTaskStatus,
			setStreamingAssistant,
			buildToolContext,
		}),
		[
			agentTaskStatus,
			appendMessage,
			branch,
			buildToolContext,
			closeOpenFile,
			closePullRequestByNumber,
			connectWorkspace,
			connectionError,
			connectionStatus,
			contextTab,
			discardAllStagedChanges,
			discardStagedChange,
			filePaths,
			isComposerSending,
			isConfigured,
			isLoadingRepositories,
			isPollingPagesStatus,
			isPushing,
			lastPushResult,
			recentlyMergedPullRequests,
			loadRepositories,
			mergePullRequestByNumber,
			messages,
			mobileTab,
			openFile,
			openWorkspaceFile,
			pagesDeployment,
			pushStagedChanges,
			rateLimit,
			refreshPagesStatus,
			refreshWorkspace,
			registerRepository,
			repositoryListError,
			repositoryOptions,
			repositorySlug,
			stageChange,
			stageOpenFile,
			stagedChanges,
			startPagesPolling,
			streamingAssistant,
			switchRepository,
			updateOpenFileContent,
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
