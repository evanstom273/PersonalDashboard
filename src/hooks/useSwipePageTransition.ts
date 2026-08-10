import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'

const FADE_MS = 100

export function useSwipePageTransition() {
	const navigate = useNavigate()
	const [isFading, setIsFading] = useState(false)

	const navigateWithFade = useCallback(
		(target: { pathname: string; search: string }) => {
			if (isFading) {
				return
			}

			setIsFading(true)

			window.setTimeout(() => {
				navigate({
					pathname: target.pathname,
					search: target.search,
				})

				window.setTimeout(() => {
					setIsFading(false)
				}, FADE_MS)
			}, FADE_MS)
		},
		[isFading, navigate],
	)

	return {
		navigateWithFade,
		contentClassName: cn(
			'swipe-nav-transition min-h-0 flex-1 flex flex-col overflow-hidden',
			isFading && 'swipe-nav-transition-fading',
		),
	}
}
