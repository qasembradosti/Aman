import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"

const ConfirmDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger" // "danger" or "warning"
}) => {
  if (!open) return null

  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange?.(false)
  }

  const handleCancel = () => {
    onOpenChange?.(false)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleCancel} 
      />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            variant === "danger" ? "bg-red-100" : "bg-yellow-100"
          )}>
            <AlertTriangle className={cn(
              "w-5 h-5",
              variant === "danger" ? "text-red-600" : "text-yellow-600"
            )} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg",
              variant === "danger" 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-yellow-600 hover:bg-yellow-700"
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export { ConfirmDialog }
