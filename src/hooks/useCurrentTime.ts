import { useEffect, useState } from 'react'

export function useCurrentTime() {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		const interval = window.setInterval(() => {
			setNow(new Date())
		}, 1000)

		return () => window.clearInterval(interval)
	}, [])

	return now
}

export function formatClockTime(date: Date): string {
	return date.toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit',
	})
}
