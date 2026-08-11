import { usePreferencesContext } from '@/providers/ChatProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import { HomeActiveProjects } from '@/components/home/HomeActiveProjects'
import { HomeRecentDocuments } from '@/components/home/HomeRecentDocuments'
import { HomeTodoSection } from '@/components/home/HomeTodoSection'
import { HomeUpcomingReminders } from '@/components/home/HomeUpcomingReminders'
import { useDocuments } from '@/hooks/useDocuments'
import { useProjects } from '@/hooks/useProjects'
import { useReminders } from '@/hooks/useReminders'

export function HomePage() {
	const { preferences } = usePreferencesContext()
	const { documents, isLoading: documentsLoading } = useDocuments()
	const { projects, isLoading: projectsLoading } = useProjects()
	const { reminders, isLoading: remindersLoading } = useReminders()
	const aiName = getConfiguredAiName(preferences)
	const displayName = preferences.userName.trim() || 'there'

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
				<div className="mx-auto flex max-w-2xl flex-col gap-5">
					<div>
						<p className="text-sm text-muted-foreground">
							{new Date().toLocaleDateString(undefined, {
								weekday: 'long',
								month: 'short',
								day: 'numeric',
							})}
						</p>
						<h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight md:text-[2rem]">
							{getTimeGreeting()}, {displayName}.
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Your snapshot from {aiName} — todos, projects, documents, and what&apos;s
							coming up.
						</p>
					</div>

					<HomeTodoSection />

					<div className="grid gap-5 md:grid-cols-2">
						<HomeUpcomingReminders
							reminders={reminders}
							isLoading={remindersLoading}
						/>
						<HomeActiveProjects projects={projects} isLoading={projectsLoading} />
					</div>

					<HomeRecentDocuments documents={documents} isLoading={documentsLoading} />
				</div>
			</div>
		</div>
	)
}

function getTimeGreeting(): string {
	const hour = new Date().getHours()

	if (hour < 12) {
		return 'Good morning'
	}

	if (hour < 17) {
		return 'Good afternoon'
	}

	return 'Good evening'
}
