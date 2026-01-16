import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange?.(false)} 
      />
      {children}
    </div>
  )
}

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-lg flex flex-col max-h-[90vh]",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogClose = ({ className, onClick, ...props }) => (
  <button
    type="button"
    className={cn(
      "text-gray-400 hover:text-gray-600 transition-colors",
      className
    )}
    onClick={onClick}
    {...props}
  >
    <X className="h-5 w-5" />
  </button>
)
DialogClose.displayName = "DialogClose"

const DialogBody = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto p-6 overscroll-contain scroll-smooth", className)}
    style={{ willChange: 'scroll-position' }}
    {...props}
  />
))
DialogBody.displayName = "DialogBody"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter,
}
