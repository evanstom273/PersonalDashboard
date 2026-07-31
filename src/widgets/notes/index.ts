import { StickyNote } from 'lucide-react'
import type { WidgetDefinition } from '@/types/widget'
import { NotesWidget } from './NotesWidget'

export const notesWidget: WidgetDefinition = {
	type: 'notes',
	name: 'Notes',
	description: 'Quick notes and scratchpad',
	icon: StickyNote,
	defaultSize: { w: 5, h: 3 },
	minSize: { w: 3, h: 2 },
	component: NotesWidget,
	defaultSettings: {
		title: 'Notes',
	},
}
