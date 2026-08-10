import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)

if ('serviceWorker' in navigator) {
	void import('virtual:pwa-register').then(({ registerSW }) => {
		registerSW({
			immediate: true,
			onRegistered(registration) {
				registration?.update()
			},
		})
	})

	let isReloadingForUpdate = false
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (isReloadingForUpdate) {
			return
		}

		isReloadingForUpdate = true
		window.location.reload()
	})
}
