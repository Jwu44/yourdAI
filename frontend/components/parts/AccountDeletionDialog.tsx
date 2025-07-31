'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AccountDeletionDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Function called when dialog should close */
  onOpenChange: (open: boolean) => void
  /** Function called when user confirms deletion */
  onConfirmDelete: () => void
  /** Whether deletion is in progress */
  isDeleting?: boolean
}

/**
 * Account deletion confirmation dialog component
 *
 * Displays a confirmation dialog matching the design requirements
 * with proper styling from globals.css and destructive action patterns.
 */
export function AccountDeletionDialog ({
  open,
  onOpenChange,
  onConfirmDelete,
  isDeleting = false
}: AccountDeletionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Delete account
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Are you sure you want to delete this account?
          </DialogDescription>
        </DialogHeader>

        {/* Warning message */}
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. This will permanently delete your account
            and remove all of your data from our servers, including all your:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Schedules</li>
            <li>Settings</li>
            <li>Integrations</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => { onOpenChange(false) }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
