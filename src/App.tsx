import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ChatPage } from '@/pages/ChatPage'
import { DocumentEditorPage } from '@/pages/DocumentEditorPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ChatProvider } from '@/providers/ChatProvider'

export function App() {
	return (
		<BrowserRouter>
			<ChatProvider>
				<Routes>
					<Route element={<AppShell />}>
						<Route index element={<ChatPage />} />
						<Route path="documents" element={<DocumentsPage />} />
						<Route path="documents/:documentId" element={<DocumentEditorPage />} />
						<Route path="settings" element={<SettingsPage />} />
					</Route>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</ChatProvider>
		</BrowserRouter>
	)
}
