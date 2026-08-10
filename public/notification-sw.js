self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	const targetUrl = event.notification.data?.url ?? '/'

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if ('focus' in client) {
						void client.focus()
						if ('navigate' in client && typeof client.navigate === 'function') {
							return client.navigate(targetUrl)
						}
						return client
					}
				}

				if (self.clients.openWindow) {
					return self.clients.openWindow(targetUrl)
				}

				return undefined
			}),
	)
})
