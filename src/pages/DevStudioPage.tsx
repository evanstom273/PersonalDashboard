import { useEffect } from 'react'
import { DevStudioChatPane } from '@/components/devStudio/DevStudioChatPane'
import { DevStudioContextPanel } from '@/components/devStudio/DevStudioContextPanel'
import { DevStudioHeader } from '@/components/devStudio/DevStudioHeader'
import {
	DevStudioMobileContent,
	DevStudioSetupBanner,
} from '@/components/devStudio/DevStudioMobileContent'
import { useDevStudioLayout } from '@/hooks/useDevStudioLayout'
import { useDevStudio } from '@/providers/DevStudioProvider'

export function DevStudioPage() {
	const { isWideLayout } = useDevStudioLayout()
	const { isConfigured, connectWorkspace } = useDevStudio()

	useEffect(() => {
		if (isConfigured) {
			void connectWorkspace()
		}
	}, [connectWorkspace, isConfigured])

	return (
		<div className="dev-studio-page flex h-full min-h-0 flex-col overflow-hidden">
			<DevStudioHeader />
			<DevStudioSetupBanner />

			{isWideLayout ? (
				<div className="dev-studio-split grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(18rem,42%)]">
					<DevStudioChatPane className="min-w-0 border-r border-border/70" />
					<DevStudioContextPanel className="min-w-0" />
				</div>
			) : (
				<DevStudioMobileContent />
			)}
		</div>
	)
}
