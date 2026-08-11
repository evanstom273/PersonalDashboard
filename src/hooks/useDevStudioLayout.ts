import { useEffect, useState } from 'react'

const WIDE_LAYOUT_QUERY = '(min-width: 840px)'

export function useDevStudioLayout(): { isWideLayout: boolean } {
	const [isWideLayout, setIsWideLayout] = useState(() =>
		typeof window !== 'undefined'
			? window.matchMedia(WIDE_LAYOUT_QUERY).matches
			: false,
	)

	useEffect(() => {
		const media = window.matchMedia(WIDE_LAYOUT_QUERY)

		function handleChange(): void {
			setIsWideLayout(media.matches)
		}

		handleChange()
		media.addEventListener('change', handleChange)
		return () => media.removeEventListener('change', handleChange)
	}, [])

	return { isWideLayout }
}
