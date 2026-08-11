import { Plus } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	DEV_STUDIO_MODELS,
	resolveDevStudioModelId,
} from '@/services/devStudio/resolveDevStudioModel'
