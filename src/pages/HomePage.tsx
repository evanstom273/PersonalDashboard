import { MessageSquare, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePreferencesContext } from '@/providers/ChatProvider'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'

export function HomePage() {
	const { preferences } = usePreferencesContext()
	const aiName = getConfiguredAiName(preferences)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<ScrollContent aiName={aiName} />
		</div>
	)
}

function ScrollContent({ aiName }: { aiName: string }) {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-8 md:px-8">
			<div className="mx-auto flex max-w-lg flex-col items-center text-center">
				<div className="home-hero-glow mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
					<Sparkles className="h-8 w-8" />
				</div>

				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Welcome back
				</h1>
				<p className="mt-2 text-sm text-muted-foreground md:text-base">
					Your personal space for {aiName}, documents, and more. Home is a blank
					canvas for now — jump into chat or browse your library.
				</p>

				<div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
					<Button asChild size="lg" className="gap-2">
						<Link to="/chat">
							<MessageSquare className="h-4 w-4" />
							Open chat
						</Link>
					</Button>
					<Button asChild variant="outline" size="lg">
						<Link to="/library">Browse library</Link>
					</Button>
				</div>

				<div className="home-placeholder-card mt-10 w-full rounded-2xl border border-dashed border-border/80 bg-card/40 p-6 text-left">
					<p className="text-xs font-medium uppercase tracking-wider text-primary">
						Coming soon
					</p>
					<p className="mt-2 text-sm text-muted-foreground">
						Widgets, reminders, and a quick overview of your day will live here.
					</p>
				</div>
			</div>
		</div>
	)
}
