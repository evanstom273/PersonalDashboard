function getNotificationIcon(): string | undefined {
	if (typeof window === 'undefined') {
		return undefined
	}

	const manifestLink = document.querySelector<HTMLLinkElement>(
		'link[rel="manifest"]',
	)
	if (!manifestLink?.href) {
		return undefined
	}

	try {
		const manifestUrl = new URL(manifestLink.href, window.location.origin)
		return `${manifestUrl.origin}/pwa-192.png`
	} catch {
		return undefined
	}
}

export function canUseNotifications(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!canUseNotifications()) {
		return 'denied'
	}

	if (Notification.permission === 'granted') {
		return 'granted'
	}

	if (Notification.permission === 'denied') {
		return 'denied'
	}

	return Notification.requestPermission()
}

export function notifyGenerationComplete(
	aiName: string,
	preview: string,
): void {
	if (!canUseNotifications() || Notification.permission !== 'granted') {
		return
	}

	if (document.visibilityState === 'visible') {
		return
	}

	const body = preview.trim().slice(0, 160) || 'Your reply is ready in chat.'

	try {
		const notification = new Notification(`${aiName} replied`, {
			body,
			icon: getNotificationIcon(),
			tag: 'chat-generation-complete',
		})

		notification.onclick = () => {
			window.focus()
			notification.close()
		}
	} catch {
		// ignore notification failures
	}
}
