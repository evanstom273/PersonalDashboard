import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm', className)}
		{...props}
	/>
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	side?: 'left' | 'right'
}

const SheetContent = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Content>,
	SheetContentProps
>(({ side = 'left', className, children, ...props }, ref) => (
	<SheetPortal>
		<SheetOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				'fixed z-50 flex h-full flex-col gap-4 border border-border bg-sidebar shadow-xl transition ease-in-out',
				side === 'left' && 'inset-y-0 left-0 w-72 border-r p-0',
				side === 'right' && 'inset-y-0 right-0 w-72 border-l p-0',
				className,
			)}
			{...props}
		>
			{children}
			<SheetClose
				className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
			>
				<X className="size-4" />
				<span className="sr-only">Close</span>
			</SheetClose>
		</DialogPrimitive.Content>
	</SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

export { Sheet, SheetTrigger, SheetClose, SheetContent }
