import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface EditModeContextValue {
	isEditMode: boolean
	setEditMode: (value: boolean) => void
	toggleEditMode: () => void
}

const EditModeContext = createContext<EditModeContextValue | null>(null)

export function EditModeProvider({ children }: { children: ReactNode }) {
	const [isEditMode, setIsEditMode] = useState(false)

	const value = useMemo(
		() => ({
			isEditMode,
			setEditMode: setIsEditMode,
			toggleEditMode: () => setIsEditMode((current) => !current),
		}),
		[isEditMode],
	)

	return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

export function useEditMode() {
	const context = useContext(EditModeContext)
	if (!context) {
		throw new Error('useEditMode must be used within an EditModeProvider')
	}

	return context
}
