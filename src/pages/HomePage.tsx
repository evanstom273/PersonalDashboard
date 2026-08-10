import { CalendarClock } from 'lucide-react'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'

export function HomePage() {
	const { preferences } = usePreferencesContext()
	const aiName = getConfiguredAiName(preferences)
	const displayName = preferences.userName.trim() || 'there'

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
				<div className="mx-auto max-w-lg">
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

					<section className="home-placeholder-card mt-8 rounded-[1.35rem] border border-border/70 p-5">
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
								<CalendarClock className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium">Your dashboard</p>
								<p className="mt-1 text-sm text-muted-foreground">
									Reminders, tasks, and quick links will land here. For now, use
									the tabs below to chat with {aiName} or open your library.
								</p>
							</div>
						</div>
					</section>
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
