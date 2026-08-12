import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DevStudioPage } from '@/pages/DevStudioPage'
import { DocumentEditorPage } from '@/pages/DocumentEditorPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { MemoryPage } from '@/pages/MemoryPage'
import { ProjectBoardPage } from '@/pages/ProjectBoardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ScratchpadPanel } from '@/components/scratchpad/ScratchpadPanel'

interface SecondaryPaneContentProps {
	route: string
}

export function SecondaryPaneContent({ route }: SecondaryPaneContentProps) {
	const currentRoute = route || '/dev-studio'

	return (
		<div className="h-full w-full overflow-hidden bg-background">
			<MemoryRouter key={currentRoute} initialEntries={[currentRoute]}>
				<Routes>
					<Route path="/dev-studio" element={<DevStudioPage />} />
					<Route path="/library/documents/:documentId" element={<DocumentEditorPage />} />
					<Route path="/library/projects/:projectId" element={<ProjectBoardPage />} />
					<Route path="/library" element={<LibraryPage />} />
					<Route path="/memory" element={<MemoryPage />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="/scratchpad" element={<ScratchpadPanel embedMode />} />
					<Route path="*" element={<DevStudioPage />} />
				</Routes>
			</MemoryRouter>
		</div>
	)
}
