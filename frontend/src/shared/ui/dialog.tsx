import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/shared/ui/cn.ts"
import { markDialogClosing } from "@/shared/utils/modalGuard"

export const ModalStackContext = React.createContext<{ depth: number }>({ depth: 0 })

interface DialogStackItem {
  id: string;
  depth: number;
  close: () => void;
}

const dialogStack: DialogStackItem[] = [];

let activeDialogCount = 0

function registerDialogToStack(id: string, depth: number, close: () => void) {
  const existingIdx = dialogStack.findIndex(item => item.id === id);
  if (existingIdx >= 0) {
    dialogStack[existingIdx] = { id, depth, close };
  } else {
    dialogStack.push({ id, depth, close });
    // Sort by depth ascending so topmost is last
    dialogStack.sort((a, b) => a.depth - b.depth);
  }
}

function unregisterDialogFromStack(id: string) {
  const idx = dialogStack.findIndex(item => item.id === id);
  if (idx >= 0) {
    dialogStack.splice(idx, 1);
  }
}

function incrementActiveDialogs() {
  activeDialogCount++
  if (typeof document !== 'undefined') {
    const body = document.body
    if (body) body.style.overflow = 'hidden'
  }
}

function decrementActiveDialogs() {
  activeDialogCount = Math.max(0, activeDialogCount - 1)
  markDialogClosing()
  if (activeDialogCount === 0) {
    recoverDocumentInteractivityIfNoDialogsOpen()
  }
}

function recoverStuckDocumentLocks() {
  if (typeof document === 'undefined') return
  const hasOpenDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
  if (hasOpenDialog || activeDialogCount > 0) return

  const body = document.body
  const html = document.documentElement

  if (body?.style?.pointerEvents === 'none') body.style.pointerEvents = ''
  if (html?.style?.pointerEvents === 'none') html.style.pointerEvents = ''

  if (body?.style?.overflow === 'hidden') body.style.overflow = ''
  if (html?.style?.overflow === 'hidden') html.style.overflow = ''

  if (body?.style?.paddingRight) body.style.paddingRight = ''
  if (body?.style?.touchAction) body.style.touchAction = ''
}

const DIALOG_GUARD_KEY = '__vl_dialog_lock_guard__'
const DIALOG_ACTIVE_KEY = '__vl_dialog_active_id__'

function handleGlobalDialogKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.keyCode === 27) {
    if (dialogStack.length > 0) {
      // Find the topmost dialog (highest depth)
      const top = dialogStack[dialogStack.length - 1];
      if (top && typeof top.close === 'function') {
        e.preventDefault();
        e.stopPropagation();
        top.close();
      }
    }
  }
}

function ensureDialogLockGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const w = window as any
  if (w[DIALOG_GUARD_KEY]) return
  w[DIALOG_GUARD_KEY] = true

  const body = document.body
  if (!body) return

  const observer = new MutationObserver(() => {
    if (document.body?.style?.pointerEvents === 'none' && activeDialogCount === 0) {
      recoverStuckDocumentLocks()
    }
  })
  observer.observe(body, { attributes: true, attributeFilter: ['style', 'class'] })

  window.addEventListener('pageshow', recoverStuckDocumentLocks)
  window.addEventListener('focus', recoverStuckDocumentLocks)
  window.addEventListener('keydown', handleGlobalDialogKeyDown, true)
}

function recoverDocumentInteractivityIfNoDialogsOpen(attempt = 0) {
  if (typeof document === "undefined") return

  // Cuando un Dialog se cierra, Radix puede dejar el DOM montado unos ms para animaciones.
  const hasOpenDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
  if (hasOpenDialog || activeDialogCount > 0) {
    if (attempt < 10) {
      setTimeout(() => recoverDocumentInteractivityIfNoDialogsOpen(attempt + 1), 50)
      return
    }
  }

  const body = document.body
  const html = document.documentElement

  const looksLocked =
    body?.style?.pointerEvents === "none" ||
    html?.style?.pointerEvents === "none" ||
    body?.style?.overflow === "hidden" ||
    html?.style?.overflow === "hidden" ||
    body?.style?.touchAction === "none" ||
    Boolean(body?.style?.paddingRight) ||
    Boolean(body?.style?.touchAction)

  if (!looksLocked) return

  if (body?.style?.pointerEvents === "none") body.style.pointerEvents = ""
  if (html?.style?.pointerEvents === "none") html.style.pointerEvents = ""

  if (body?.style?.overflow === "hidden") body.style.overflow = ""
  if (html?.style?.overflow === "hidden") html.style.overflow = ""

  if (body?.style?.paddingRight) body.style.paddingRight = ""
  if (body?.style?.touchAction) body.style.touchAction = ""
}

type DialogProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>

const Dialog: React.FC<DialogProps> = ({ open, defaultOpen, onOpenChange, modal, children, ...props }) => {
  const { depth: parentDepth } = React.useContext(ModalStackContext)
  const isControlled = typeof open === "boolean"
  const [internalOpen, setInternalOpen] = React.useState<boolean>(Boolean(defaultOpen))
  const isOpen = isControlled ? Boolean(open) : internalOpen
  const wasOpenRef = React.useRef(false)
  const instanceId = React.useId()

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        markDialogClosing()
      }
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  React.useEffect(() => {
    ensureDialogLockGuard()
  }, [instanceId, isOpen, onOpenChange])

  React.useEffect(() => {
    if (!isOpen) return
    try {
      ; (window as any)[DIALOG_ACTIVE_KEY] = instanceId
      window.dispatchEvent(new CustomEvent('vl:dialog-open', { detail: { id: instanceId } }))
    } catch {
      // ignore
    }
  }, [instanceId, isOpen])

  const currentDepth = parentDepth + 1

  React.useEffect(() => {
    ensureDialogLockGuard()
    if (isOpen) {
      registerDialogToStack(instanceId, currentDepth, () => handleOpenChange(false))
      if (!wasOpenRef.current) {
        wasOpenRef.current = true
        incrementActiveDialogs()
      }
      return
    }

    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false
      unregisterDialogFromStack(instanceId)
      decrementActiveDialogs()
    }
  }, [isOpen, instanceId, currentDepth, handleOpenChange])

  React.useEffect(() => {
    return () => {
      unregisterDialogFromStack(instanceId)
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        decrementActiveDialogs()
      }
    }
  }, [instanceId])

  return (
    <ModalStackContext.Provider value={{ depth: currentDepth }}>
      <DialogPrimitive.Root
        open={isOpen}
        onOpenChange={handleOpenChange}
        modal={typeof modal === "boolean" ? modal : true}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </ModalStackContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, style, ...props }, ref) => {
  const { depth } = React.useContext(ModalStackContext)
  const hasCustomZIndex = style && typeof (style as any).zIndex !== 'undefined';
  const computedZIndex = hasCustomZIndex ? undefined : 1100 + Math.max(0, depth - 1) * 100;

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 vl-modal-overlay",
        "pointer-events-auto",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none motion-reduce:animate-none",
        className
      )}
      style={computedZIndex ? { ...style, zIndex: computedZIndex } : style}
      {...props}
    />
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string
    zIndex?: number
    fullWidth?: boolean
    closeButtonClassName?: string
    preventCloseOnOutsideClick?: boolean
  }
>(({ className, children, overlayClassName, zIndex, fullWidth, closeButtonClassName, preventCloseOnOutsideClick, onPointerDownOutside, onInteractOutside, onCloseAutoFocus, style: propsStyle, ...props }, ref) => {
  const { depth } = React.useContext(ModalStackContext)
  const effectiveZIndex = zIndex ?? (1200 + Math.max(0, depth - 1) * 100)
  const overlayZIndex = zIndex ? zIndex - 1 : (1100 + Math.max(0, depth - 1) * 100)

  return (
    <DialogPortal>
      <DialogOverlay
        className={overlayClassName}
        style={{ zIndex: overlayZIndex }}
      />
      <DialogPrimitive.Content
        ref={ref}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          onCloseAutoFocus?.(e)
        }}
        onPointerDownOutside={(e) => {
          if (preventCloseOnOutsideClick) {
            e.preventDefault()
          }
          onPointerDownOutside?.(e)
        }}
        onInteractOutside={(e) => {
          if (preventCloseOnOutsideClick) {
            e.preventDefault()
          }
          onInteractOutside?.(e)
        }}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          fullWidth
            ? "w-[98vw] sm:w-[96vw] max-w-[98vw] sm:max-w-[96vw]"
            : cn(
                "w-[calc(100vw-2rem)] sm:w-auto",
                "min-w-0 sm:min-w-[400px]",
                "max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl",
              ),
          "h-auto",
          "max-h-[92dvh] sm:max-h-[90dvh]",
          "vl-modal-surface text-card-foreground",
          "ring-1 ring-black/5 dark:ring-white/10",
          "rounded-2xl",
          "shadow-2xl shadow-black/20 dark:shadow-black/40",
          "p-0 sm:p-0 gap-0 overflow-hidden",
          "motion-safe:duration-300 motion-safe:ease-out motion-reduce:duration-0",
          "data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ ...propsStyle, zIndex: effectiveZIndex }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          onClick={(e) => {
            e.stopPropagation()
            markDialogClosing()
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
          className={cn(
            "absolute right-3 top-3 sm:right-4 sm:top-4",
            "z-50 flex h-11 w-11 items-center justify-center rounded-full",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none transition-colors backdrop-blur-sm",
            closeButtonClassName || "bg-black/5 text-gray-500 hover:bg-black/10 hover:text-gray-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 focus:ring-primary/50"
          )}
          aria-label="Cerrar diálogo"
          title="Cerrar (Escape)"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
