import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMobileNavLayout } from '@/hooks/useMobileNavLayout'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import {
	buildSwipeNavLocation,
	getSwipeNavStep,
	isSwipeNavigationPath,
	resolveSwipeNavIndex,
} from '@/navigation/swipeNav'

export function useAppSwipeNavigation(): void {
	const location = useLocation()
	const navigate = useNavigate()
	const isMobileNav = useMobileNavLayout()

	const enabled =
		isMobileNav &&
		isSwipeNavigationPath(location.pathname) &&
		!location.pathname.startsWith('/library/documents/') &&
		!location.pathname.startsWith('/library/projects/')

	const navigateByOffset = useCallback(
		(offset: number) => {
			const currentIndex = resolveSwipeNavIndex(
				location.pathname,
				new URLSearchParams(location.search),
			)

			if (currentIndex < 0) {
				return
			}

			const step = getSwipeNavStep(currentIndex + offset)
			if (!step) {
				return
			}

			const target = buildSwipeNavLocation(step)
			navigate({
				pathname: target.pathname,
				search: target.search,
			})
		},
		[location.pathname, location.search, navigate],
	)

	useSwipeNavigation({
		enabled,
		onSwipeLeft: () => navigateByOffset(-1),
		onSwipeRight: () => navigateByOffset(1),
	})
}
