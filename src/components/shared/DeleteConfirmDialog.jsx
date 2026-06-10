import { Dialog, Button } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'

export default function DeleteConfirmDialog({ open, onClose, onConfirm, itemName, message }) {
  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Delete {itemName ? `"${itemName}"` : 'this item'}?
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {message || 'This action cannot be undone.'}
        </p>
        <div className="mt-5 flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
