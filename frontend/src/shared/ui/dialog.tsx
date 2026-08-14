import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { X } from "lucide-react"

import { cn } from "@/shared/ui/cn.ts"

function recoverStuckDocumentLocks() {
  if (typeof document === 'undefined') return
  const hasOpenDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
  if (hasOpenDialog) return

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
function ensureDialogLockGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const w = window as any
  if (w[DIALOG_GUARD_KEY]) return
  w[DIALOG_GUARD_KEY] = true

  const body = document.body
  if (!body) return

  const observer = new MutationObserver(() => {
    if (document.body?.style?.pointerEvents === 'none') {
      recoverStuckDocumentLocks()
    }
  })
  observer.observe(body, { attributes: true, attributeFilter: ['style', 'class'] })

  window.addEventListener('pageshow', recoverStuckDocumentLocks)
  window.addEventListener('focus', recoverStuckDocumentLocks)
}

function recoverDocumentInteractivityIfNoDialogsOpen(attempt = 0) {
  if (typeof document === "undefined") return

  // Cuando un Dialog se cierra, Radix puede dejar el DOM montado unos ms para animaciones.
  // Reintentar un poco antes de forzar cleanup.
  const hasOpenDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
  if (hasOpenDialog) {
    if (attempt < 10) {
      setTimeout(() => recoverDocumentInteractivityIfNoDialogsOpen(attempt + 1), 50)
      return
    }
    // Tras varios intentos: si el DOM sigue reportando "open" pero el lock quedó pegado,
    // preferimos recuperar interacción para evitar una UI congelada.
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

  // Estos estilos pueden quedar pegados si un modal se desmonta sin liberar el lock.
  if (body?.style?.paddingRight) body.style.paddingRight = ""
  if (body?.style?.touchAction) body.style.touchAction = ""
}

type DialogProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>

const Dialog: React.FC<DialogProps> = ({ open, defaultOpen, onOpenChange, modal, ...props }) => {
  const isControlled = typeof open === "boolean"
  const [internalOpen, setInternalOpen] = React.useState<boolean>(Boolean(defaultOpen))
  const isOpen = isControlled ? Boolean(open) : internalOpen
  const wasOpenRef = React.useRef(false)
  const instanceId = React.useId()

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  React.useEffect(() => {
    ensureDialogLockGuard()
    // Previously, this effect closed other open dialogs when a new one opened.
    // We removed this behavior to allow stacked/nested modals.
    //
    // const handler = (evt: Event) => {
    //   const e = evt as CustomEvent<{ id?: string }>
    //   if (!isOpen) return
    //   if (!e?.detail?.id) return
    //   if (e.detail.id === instanceId) return
    //   onOpenChange?.(false)
    // }
    // window.addEventListener('vl:dialog-open', handler as any)
    // return () => window.removeEventListener('vl:dialog-open', handler as any)
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

  React.useEffect(() => {
    ensureDialogLockGuard()
    if (isOpen) {
      wasOpenRef.current = true
      const body = document?.body
      if (body) body.style.overflow = 'hidden'
      return
    }

    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false
      const body = document?.body
      if (body?.style?.overflow === 'hidden') body.style.overflow = ''
      setTimeout(recoverDocumentInteractivityIfNoDialogsOpen, 0)
      setTimeout(recoverDocumentInteractivityIfNoDialogsOpen, 60)
      setTimeout(recoverStuckDocumentLocks, 120)
    }
  }, [isOpen])

  React.useEffect(() => {
    return () => {
      setTimeout(recoverDocumentInteractivityIfNoDialogsOpen, 0)
      setTimeout(recoverStuckDocumentLocks, 120)
    }
  }, [])

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      // modal=false evita que Radix aplique disableOutsidePointerEvents al body.
      // El overlay cubre y bloquea clicks al fondo.
      modal={typeof modal === "boolean" ? modal : true}
      {...props}
    />
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, style, ...props }, ref) => {
  // Si hay un zIndex en style, no aplicar la clase z-[900]
  const hasCustomZIndex = style && typeof (style as any).zIndex !== 'undefined';

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 vl-modal-overlay",
        // Solo aplicar z-[1100] si NO hay zIndex personalizado
        !hasCustomZIndex && "z-[1100]",
        "pointer-events-auto",
        // Importante: si por alguna razón el overlay queda montado en estado "closed",
        // no debe bloquear la interacción con la página.
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none motion-reduce:animate-none",
        className
      )}
      style={style}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
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
  }
>(({ className, children, overlayClassName, zIndex, fullWidth, closeButtonClassName, style: propsStyle, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay
      className={overlayClassName}
      style={zIndex ? { zIndex: zIndex - 1 } : undefined}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Posicionamiento centrado
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        !zIndex && "z-[1200]",

        // Modo fullWidth: ocupa casi todo el ancho disponible
        fullWidth
          ? "w-[98vw] sm:w-[96vw] max-w-[98vw] sm:max-w-[96vw]"
          : cn(
              "w-[calc(100vw-2rem)] sm:w-auto",
              "min-w-0 sm:min-w-[400px]",
              "max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl",
            ),

        // Altura adaptativa con límites
        "h-auto",
        "max-h-[90vh] sm:max-h-[92vh]",

        // Estética premium
        "vl-modal-surface text-card-foreground",
        "ring-1 ring-black/5 dark:ring-white/10",
        "rounded-2xl",
        "shadow-2xl shadow-black/20 dark:shadow-black/40",
        "p-0 sm:p-0 gap-0 overflow-hidden",

        // Estados y animaciones
        "data-[state=closed]:pointer-events-none",
        "overflow-hidden",
        "motion-safe:duration-300 motion-safe:ease-out motion-reduce:duration-0",
        "data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2",

        className
      )}
      onClick={(e) => e.stopPropagation()}
      style={zIndex ? { ...propsStyle, zIndex } : propsStyle}
      {...props}
    >
      <VisuallyHidden>
        <DialogPrimitive.Title>Diálogo de Villa Luz</DialogPrimitive.Title>
        <DialogPrimitive.Description>Contenido del diálogo</DialogPrimitive.Description>
      </VisuallyHidden>
      {children}
      <DialogPrimitive.Close className={cn(
        "absolute right-3 top-3 sm:right-4 sm:top-4",
        "z-50 flex h-11 w-11 items-center justify-center rounded-full",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none transition-colors backdrop-blur-sm",
        closeButtonClassName || "bg-black/5 text-gray-500 hover:bg-black/10 hover:text-gray-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 focus:ring-primary/50"
      )} aria-label="Cerrar diálogo">
        <X className="h-4 w-4" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
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
