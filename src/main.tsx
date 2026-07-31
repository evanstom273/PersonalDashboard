import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardProvider } from '@/providers/DashboardProvider'
import { queryClient } from '@/services/queryClient'
import { DashboardPage } from '@/pages/DashboardPage'
import './index.css'

registerSW({
	immediate: true,
	onOfflineReady() {
		console.info('Personal Dashboard is ready to work offline.')
	},
})

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<DashboardProvider>
					<DashboardPage />
				</DashboardProvider>
			</TooltipProvider>
		</QueryClientProvider>
	</StrictMode>,
)
