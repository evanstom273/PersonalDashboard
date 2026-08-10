import {
	ArrowLeft,
	CheckSquare,
	FileText,
	MoreHorizontal,
	Plus,
	Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDocuments } from '@/hooks/useDocuments'
import { useProjects } from '@/hooks/useProjects'
import { getProject, subscribeProjectsChanged } from '@/services/projects/projectService'
import type {
	ProjectChecklistItem,
	ProjectRecord,
	ProjectTaskRecord,
	ProjectTaskStatus,
} from '@/storage/types'
import { cn } from '@/utils/cn'

const COLUMNS: Array<{ id: ProjectTaskStatus; label: string }> = [
	{ id: 'todo', label: 'To do' },
	{ id: 'doing', label: 'Doing' },
	{ id: 'done', label: 'Done' },
]

export function ProjectBoardPage() {
	const { projectId = '' } = useParams()
	const navigate = useNavigate()
	const { saveTask, addTask, changeTaskStatus, removeTask } = useProjects()
	const [project, setProject] = useState<ProjectRecord | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [editingTask, setEditingTask] = useState<ProjectTaskRecord | null>(null)
	const [creatingStatus, setCreatingStatus] = useState<ProjectTaskStatus | null>(
		null,
	)

	const refreshProject = useCallback(async (): Promise<void> => {
		if (!projectId) {
			setProject(null)
			setIsLoading(false)
			return
		}

		const next = await getProject(projectId)
		setProject(next ?? null)
		setIsLoading(false)
	}, [projectId])

	useEffect(() => {
		void refreshProject()
	}, [refreshProject])

	useEffect(() => {
		return subscribeProjectsChanged(() => {
			void refreshProject()
		})
	}, [refreshProject])

	const columns = useMemo(() => {
		if (!project) {
			return {
				todo: [] as ProjectTaskRecord[],
				doing: [] as ProjectTaskRecord[],
				done: [] as ProjectTaskRecord[],
			}
		}

		return {
			todo: project.tasks.filter((task) => task.status === 'todo'),
			doing: project.tasks.filter((task) => task.status === 'doing'),
			done: project.tasks.filter((task) => task.status === 'done'),
		}
	}, [project])

	if (isLoading) {
		return <p className="px-4 py-6 text-sm text-muted-foreground">Loading board…</p>
	}

	if (!project) {
		return (
			<div className="px-4 py-10 text-center">
				<p className="text-sm text-muted-foreground">Project not found.</p>
				<Button className="mt-4" variant="outline" asChild>
					<Link to="/library?section=projects">Back to projects</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="shrink-0 border-b border-border/80 px-4 py-3 md:px-6">
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="px-2"
						onClick={() => navigate('/library?section=projects')}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="min-w-0 flex-1">
						<h2 className="truncate text-base font-semibold">{project.title}</h2>
						{project.description ? (
							<p className="truncate text-xs text-muted-foreground">
								{project.description}
							</p>
						) : null}
					</div>
				</div>
			</div>

			<div
				className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 py-4 md:px-6"
				data-horizontal-scroll
			>
				<div className="flex h-full min-w-max gap-4">
					{COLUMNS.map((column) => (
						<section
							key={column.id}
							className="flex w-[min(85vw,20rem)] shrink-0 flex-col rounded-xl border border-border/70 bg-card/40"
						>
							<div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
								<h3 className="text-sm font-medium">{column.label}</h3>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									className="h-8 w-8 px-0"
									onClick={() => setCreatingStatus(column.id)}
									aria-label={`Add task to ${column.label}`}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							<div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
								{columns[column.id].map((task) => (
									<TaskCard
										key={task.id}
										task={task}
										onOpen={() => setEditingTask(task)}
										onMove={(status) => {
											void changeTaskStatus(project.id, task.id, status)
										}}
										onDelete={() => {
											if (window.confirm(`Delete "${task.title}"?`)) {
												void removeTask(project.id, task.id)
											}
										}}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			</div>

			<TaskEditorDialog
				open={creatingStatus !== null}
				status={creatingStatus ?? 'todo'}
				onOpenChange={(open) => {
					if (!open) {
						setCreatingStatus(null)
					}
				}}
				onSave={async (input) => {
					await addTask(project.id, { ...input, status: creatingStatus ?? 'todo' })
					setCreatingStatus(null)
				}}
			/>

			<TaskEditorDialog
				open={editingTask !== null}
				task={editingTask ?? undefined}
				status={editingTask?.status ?? 'todo'}
				onOpenChange={(open) => {
					if (!open) {
						setEditingTask(null)
					}
				}}
				onSave={async (input) => {
					if (!editingTask) {
						return
					}

					await saveTask(project.id, editingTask.id, input)
					setEditingTask(null)
				}}
			/>
		</div>
	)
}

function TaskCard({
	task,
	onOpen,
	onMove,
	onDelete,
}: {
	task: ProjectTaskRecord
	onOpen: () => void
	onMove: (status: ProjectTaskStatus) => void
	onDelete: () => void
}) {
	const checkedCount = task.checklist.filter((item) => item.checked).length

	return (
		<div className="surface-panel rounded-lg p-3">
			<div className="flex items-start gap-2">
				<button
					type="button"
					onClick={onOpen}
					className="min-w-0 flex-1 text-left"
				>
					<p className="font-medium">{task.title}</p>
					{task.note ? (
						<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
							{task.note}
						</p>
					) : null}
					{task.checklist.length > 0 ? (
						<p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
							<CheckSquare className="h-3.5 w-3.5" />
							{checkedCount}/{task.checklist.length}
						</p>
					) : null}
					{task.documentIds.length > 0 ? (
						<p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
							<FileText className="h-3.5 w-3.5" />
							{task.documentIds.length} linked
						</p>
					) : null}
				</button>
				<DropdownMenu>
					<DropdownMenuTrigger
						hideChevron
						className="h-8 w-8 shrink-0 justify-center px-0"
						aria-label="Task actions"
					>
						<MoreHorizontal className="h-4 w-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={onOpen}>Edit</DropdownMenuItem>
						{COLUMNS.filter((column) => column.id !== task.status).map((column) => (
							<DropdownMenuItem
								key={column.id}
								onSelect={() => onMove(column.id)}
							>
								Move to {column.label}
							</DropdownMenuItem>
						))}
						<DropdownMenuItem className="text-destructive" onSelect={onDelete}>
							<Trash2 className="h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	)
}

function TaskEditorDialog({
	open,
	task,
	status,
	onOpenChange,
	onSave,
}: {
	open: boolean
	task?: ProjectTaskRecord
	status: ProjectTaskStatus
	onOpenChange: (open: boolean) => void
	onSave: (input: {
		title: string
		note?: string
		status?: ProjectTaskStatus
		checklist: ProjectChecklistItem[]
		documentIds: string[]
		reminderId?: string
	}) => Promise<void>
}) {
	const { documents } = useDocuments()
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [taskStatus, setTaskStatus] = useState<ProjectTaskStatus>(status)
	const [checklist, setChecklist] = useState<ProjectChecklistItem[]>([])
	const [newChecklistItem, setNewChecklistItem] = useState('')
	const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
	const [reminderId, setReminderId] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		if (!open) {
			return
		}

		setTitle(task?.title ?? '')
		setNote(task?.note ?? '')
		setTaskStatus(task?.status ?? status)
		setChecklist(task?.checklist ?? [])
		setSelectedDocumentIds(task?.documentIds ?? [])
		setReminderId(task?.reminderId ?? '')
		setNewChecklistItem('')
		setFormError(null)
	}, [open, status, task])

	async function handleSubmit(event: FormEvent): Promise<void> {
		event.preventDefault()
		setFormError(null)

		if (!title.trim()) {
			setFormError('Title is required.')
			return
		}

		setIsSaving(true)
		try {
			await onSave({
				title: title.trim(),
				note: note.trim() || undefined,
				status: taskStatus,
				checklist,
				documentIds: selectedDocumentIds,
				reminderId: reminderId.trim() || undefined,
			})
		} catch (error) {
			setFormError(
				error instanceof Error ? error.message : 'Could not save task.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	function toggleDocument(documentId: string): void {
		setSelectedDocumentIds((current) =>
			current.includes(documentId)
				? current.filter((id) => id !== documentId)
				: [...current, documentId],
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="task-title" className="text-sm font-medium">
							Title
						</label>
						<input
							id="task-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="task-status" className="text-sm font-medium">
							Column
						</label>
						<select
							id="task-status"
							value={taskStatus}
							onChange={(event) =>
								setTaskStatus(event.target.value as ProjectTaskStatus)
							}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						>
							{COLUMNS.map((column) => (
								<option key={column.id} value={column.id}>
									{column.label}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<label htmlFor="task-note" className="text-sm font-medium">
							Note
						</label>
						<textarea
							id="task-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							rows={3}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					<div className="space-y-2">
						<p className="text-sm font-medium">Checklist</p>
						<div className="space-y-2">
							{checklist.map((item) => (
								<label
									key={item.id}
									className="flex items-center gap-2 text-sm"
								>
									<input
										type="checkbox"
										checked={item.checked}
										onChange={(event) => {
											setChecklist((current) =>
												current.map((entry) =>
													entry.id === item.id
														? { ...entry, checked: event.target.checked }
														: entry,
												),
											)
										}}
									/>
									<span className={cn(item.checked && 'line-through opacity-70')}>
										{item.label}
									</span>
									<button
										type="button"
										className="ml-auto text-xs text-destructive"
										onClick={() => {
											setChecklist((current) =>
												current.filter((entry) => entry.id !== item.id),
											)
										}}
									>
										Remove
									</button>
								</label>
							))}
						</div>
						<div className="flex gap-2">
							<input
								value={newChecklistItem}
								onChange={(event) => setNewChecklistItem(event.target.value)}
								placeholder="Add checklist item"
								className="min-w-0 flex-1 rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
							/>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									const label = newChecklistItem.trim()
									if (!label) {
										return
									}

									setChecklist((current) => [
										...current,
										{ id: crypto.randomUUID(), label, checked: false },
									])
									setNewChecklistItem('')
								}}
							>
								Add
							</Button>
						</div>
					</div>
					{documents.length > 0 ? (
						<div className="space-y-2">
							<p className="text-sm font-medium">Linked documents</p>
							<div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
								{documents.map((document) => (
									<label
										key={document.id}
										className="flex items-center gap-2 text-sm"
									>
										<input
											type="checkbox"
											checked={selectedDocumentIds.includes(document.id)}
											onChange={() => toggleDocument(document.id)}
										/>
										<span className="truncate">{document.title}</span>
									</label>
								))}
							</div>
						</div>
					) : null}
					<div className="space-y-2">
						<label htmlFor="task-reminder-id" className="text-sm font-medium">
							Reminder id{' '}
							<span className="text-muted-foreground">(optional)</span>
						</label>
						<input
							id="task-reminder-id"
							value={reminderId}
							onChange={(event) => setReminderId(event.target.value)}
							placeholder="Link an existing reminder"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					{formError ? (
						<p className="text-sm text-destructive">{formError}</p>
					) : null}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Saving…' : 'Save task'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
