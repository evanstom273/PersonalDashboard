import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useDevStudio } from '@/providers/DevStudioProvider'
import { DevStudioChangesPanel } from '@/components/devStudio/DevStudioChangesPanel'
import { DevStudioChatPane } from '@/components/devStudio/DevStudioChatPane'
import { DevStudioDiffPanel } from '@/components/devStudio/DevStudioDiffPanel'
import { DevStudioFilesPanel } from '@/components/devStudio/DevStudioFilesPanel'
import { DevStudioGitPanel } from '@/components/devStudio/DevStudioGitPanel'
import { DevStudioMobileTabs } from '@/components/devStudio/DevStudioMobileTabs'

export function DevStudioMobileContent() {
	const { mobileTab } = useDevStudio()

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<DevStudioMobileTabs />
			<div className="min-h-0 flex-1">
				{mobileTab === 'chat' ? <DevStudioChatPane /> : null}
				{mobileTab === 'diff' ? <DevStudioDiffPanel /> : null}
				{mobileTab === 'files' ? <DevStudioFilesPanel /> : null}
				{mobileTab === 'git' ? <DevStudioGitPanel /> : null}
				{mobileTab === 'git' ? (
					<div className="hidden">
						<DevStudioChangesPanel />
					</div>
				) : null}
			</div>
		</div>
	)
}

export function DevStudioSetupBanner() {
	const { isConfigured, connectWorkspace, connectionStatus } = useDevStudio()

	if (isConfigured) {
		return null
	}

	return (
		<div className="shrink-0 border-b border-primary/20 bg-primary/10 px-4 py-3 text-sm md:px-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-primary">
					Add a GitHub token and repository in Settings to load your workspace.
				</p>
				<div className="flex gap-2">
					<Button asChild size="sm" variant="secondary">
						<Link to="/settings?tab=app">Open Settings</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void connectWorkspace()}
						disabled={connectionStatus === 'connecting'}
					>
						Retry connect
					</Button>
				</div>
			</div>
		</div>
	)
}
