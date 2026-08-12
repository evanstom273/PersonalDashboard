import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFoldableDevice, type FoldableDeviceInfo } from '@/hooks/useFoldableDevice'
import { usePreferencesContext } from '@/providers/ChatProvider'

export interface FoldablePaneContextValue {
	foldableInfo: FoldableDeviceInfo
	isDualPaneActive: boolean
	pane1Route: string
	pane2Route: string
	splitRatio: number
	activePane: 'pane1' | 'pane2'
	setPane1Route: (route: string) => void
	setPane2Route: (route: string) => void
	openInSecondaryPane: (route: string) => void
	closeSecondaryPane: () => void
	swapPanes: () => void
	setSplitRatio: (ratio: number) => void
	setActivePane: (pane: 'pane1' | 'pane2') => void
}

const FoldablePaneContext = createContext<FoldablePaneContextValue | null>(null)

const DEFAULT_SECONDARY_ROUTE = '/library'

export function FoldablePaneProvider({ children }: { children: ReactNode }) {
	const { preferences, savePreferences } = usePreferencesContext()
	const foldableInfo = useFoldableDevice(preferences)
	const location = useLocation()
	const navigate = useNavigate()

	const [splitRatio, setRatioState] = useState<number>(
		preferences.dualPaneSplitRatio ?? 50,
	)
	const [pane1Route, setPane1RouteState] = useState<string>('/chat')
	const [pane2Route, setPane2RouteState] = useState<string>(DEFAULT_SECONDARY_ROUTE)
	const [activePane, setActivePane] = useState<'pane1' | 'pane2'>('pane1')

	// Keep ratio synced with preference changes
	useEffect(() => {
		if (preferences.dualPaneSplitRatio !== undefined) {
			setRatioState(preferences.dualPaneSplitRatio)
		}
	}, [preferences.dualPaneSplitRatio])

	// Update pane 1 route when main location changes, unless it's the secondary route path
	useEffect(() => {
		const currentPath = location.pathname + location.search
		if (foldableInfo.isDualPaneActive) {
			if (currentPath !== pane2Route) {
				setPane1RouteState(currentPath)
			}
		} else {
			setPane1RouteState(currentPath)
		}
	}, [location.pathname, location.search, foldableInfo.isDualPaneActive, pane2Route])

	const setSplitRatio = useCallback(
		(ratio: number) => {
			const clamped = Math.min(80, Math.max(20, Math.round(ratio)))
			setRatioState(clamped)
			void savePreferences({
				...preferences,
				dualPaneSplitRatio: clamped,
			})
		},
		[preferences, savePreferences],
	)

	const openInSecondaryPane = useCallback(
		(route: string) => {
			setPane2RouteState(route)
			setActivePane('pane2')
			// If dual pane is not active, navigate to the route directly
			if (!foldableInfo.isDualPaneActive) {
				navigate(route)
			}
		},
		[foldableInfo.isDualPaneActive, navigate],
	)

	const closeSecondaryPane = useCallback(() => {
		setPane2RouteState('')
		setActivePane('pane1')
	}, [])

	const swapPanes = useCallback(() => {
		const temp1 = pane1Route
		const temp2 = pane2Route
		setPane1RouteState(temp2)
		setPane2RouteState(temp1)
		if (temp2) {
			navigate(temp2)
		}
	}, [pane1Route, pane2Route, navigate])

	const contextValue = useMemo<FoldablePaneContextValue>(
		() => ({
			foldableInfo,
			isDualPaneActive: foldableInfo.isDualPaneActive,
			pane1Route,
			pane2Route,
			splitRatio,
			activePane,
			setPane1Route: setPane1RouteState,
			setPane2Route: setPane2RouteState,
			openInSecondaryPane,
			closeSecondaryPane,
			swapPanes,
			setSplitRatio,
			setActivePane,
		}),
		[
			foldableInfo,
			pane1Route,
			pane2Route,
			splitRatio,
			activePane,
			openInSecondaryPane,
			closeSecondaryPane,
			swapPanes,
			setSplitRatio,
		],
	)

	return (
		<FoldablePaneContext.Provider value={contextValue}>
			{children}
		</FoldablePaneContext.Provider>
	)
}

export function useFoldablePaneContext(): FoldablePaneContextValue {
	const context = useContext(FoldablePaneContext)
	if (!context) {
		throw new Error('useFoldablePaneContext must be used within a FoldablePaneProvider')
	}
	return context
}
