/**
 * @file page.tsx
 * @description Archive page for viewing and managing archived tasks
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Calendar, AlertCircle, Trash2 } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Components
import { SidebarLayout } from '@/components/parts/SidebarLayout'
import EditableScheduleRow from '@/components/parts/EditableScheduleRow'

// Hooks and Services
import { useToast } from '@/hooks/use-toast'
import { getArchivedTasks, moveArchivedTaskToToday, deleteArchivedTask } from '@/lib/api/archive'
import { loadSchedule, updateSchedule } from '@/lib/ScheduleHelper'

// Types
import { type Task } from '@/lib/types'

interface ArchivedTask {
  taskId: string
  archivedAt: string
  task: Task
  originalDate: string
}

/**
 * Archive Page Component
 * Displays all archived tasks for the current user in chronological order
 */
const ArchivePage: React.FC = () => {
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  /**
   * Load archived tasks from the API
   */
  const loadArchivedTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getArchivedTasks()

      if (result.success) {
        setArchivedTasks(result.archivedTasks)
      } else {
        throw new Error(result.error || 'Failed to load archived tasks')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load archived tasks'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  /**
   * Handle moving an archived task to today's schedule
   */
  const handleMoveToToday = useCallback(async (taskId: string) => {
    try {
      // Move the task to today via API
      const moveResult = await moveArchivedTaskToToday(taskId)

      if (!moveResult.success) {
        throw new Error(moveResult.error || 'Failed to move task to today')
      }

      // Get today's date
      const todayDate = new Date().toISOString().split('T')[0]

      // Load existing schedule for today and add the moved task
      try {
        const existingScheduleResult = await loadSchedule(todayDate)

        let existingTasks: Task[] = []
        if (existingScheduleResult.success && existingScheduleResult.schedule) {
          existingTasks = existingScheduleResult.schedule
        }

        // Add the moved task to existing tasks (at the bottom)
        const updatedTasks = [...existingTasks, moveResult.task!]

        // Update the schedule with the combined tasks
        const updateResult = await updateSchedule(todayDate, updatedTasks)

        if (!updateResult.success) {
          console.warn('Failed to update schedule with moved task:', updateResult.error)
          toast({
            title: 'Warning',
            description: 'Task moved but may not appear in today\'s schedule immediately',
            variant: 'default'
          })
        } else {
        }
      } catch (scheduleError) {
        console.warn('Schedule operation failed:', scheduleError)
        toast({
          title: 'Warning',
          description: 'Task moved but may not appear in today\'s schedule immediately',
          variant: 'default'
        })
      }

      // Remove the task from archived tasks list
      setArchivedTasks(prev => prev.filter(archived => archived.taskId !== taskId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move task to today'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast, router])

  /**
   * Handle permanently deleting an archived task
   */
  const handleDeleteArchivedTask = useCallback(async (taskId: string) => {
    try {
      const result = await deleteArchivedTask(taskId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete archived task')
      }

      // Remove the task from archived tasks list
      setArchivedTasks(prev => prev.filter(archived => archived.taskId !== taskId))

      toast({
        title: 'Success',
        description: 'Archived task deleted permanently',
        variant: 'default'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete archived task'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [toast])

  /**
   * Handle archive-specific actions for EditableScheduleRow
   */
  const handleArchiveTaskAction = useCallback((task: Task, action: 'move' | 'delete') => {
    // Find the archived task by matching the task ID
    const archivedTask = archivedTasks.find(archived => archived.task.id === task.id)
    if (!archivedTask) return

    if (action === 'move') {
      handleMoveToToday(archivedTask.taskId)
    } else if (action === 'delete') {
      handleDeleteArchivedTask(archivedTask.taskId)
    }
  }, [archivedTasks, handleMoveToToday, handleDeleteArchivedTask])

  /**
   * Custom handlers for EditableScheduleRow in archive context
   */
  const handleEditTask = useCallback((task: Task) => {
    // In archive context, "edit" means move to today
    handleArchiveTaskAction(task, 'move')
  }, [handleArchiveTaskAction])

  const handleDeleteTask = useCallback((task: Task) => {
    handleArchiveTaskAction(task, 'delete')
  }, [handleArchiveTaskAction])

  // Disable archive action since we're already in archive
  const handleArchiveTask = useCallback(() => {
    // No-op in archive context
  }, [])

  // Disable task updates in archive context
  const handleUpdateTask = useCallback(() => {
    // No-op in archive context - archived tasks shouldn't be updated
  }, [])

  // Disable drag and drop in archive context
  const handleMoveTask = useCallback(() => {
    // No-op in archive context - archived tasks shouldn't be reordered
  }, [])

  /**
   * Create custom dropdown items for archive context
   */
  const createCustomDropdownItems = useCallback((archivedTask: ArchivedTask) => [
    {
      label: 'Move to today',
      icon: Calendar,
      onClick: async () => { await handleMoveToToday(archivedTask.taskId) },
      variant: 'default' as const
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: async () => { await handleDeleteArchivedTask(archivedTask.taskId) },
      variant: 'destructive' as const
    }
  ], [handleMoveToToday, handleDeleteArchivedTask])

  /**
   * Load archived tasks when component mounts
   */
  useEffect(() => {
    loadArchivedTasks()
  }, [loadArchivedTasks])

  /**
   * Format archive date for display
   */
  const formatArchiveDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Unknown date'
    }
  }, [])

  return (
    <SidebarLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          {/* Page Header */}
          <div className="mb-8 pt-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-container">
                <Archive className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
              {!isLoading && (
                <Badge variant="secondary" className="ml-2">
                  {archivedTasks.length} {archivedTasks.length === 1 ? 'task' : 'tasks'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Manage your archived tasks. Move them back to today's schedule or delete them permanently.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading archived tasks...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="mb-6">
              <CardContent className="flex items-center gap-3 p-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Failed to load archived tasks</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button onClick={loadArchivedTasks} variant="outline" size="sm">
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && archivedTasks.length === 0 && (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center max-w-md">
                <Archive className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived tasks yet</h3>
                <p className="text-muted-foreground mb-6">
                  Archive any tasks for future use. Archived tasks can be moved back to your schedule or deleted permanently.
                </p>
                <Button
                  onClick={() => { router.push('/dashboard') }}
                  variant="outline"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Calendar className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Archived Tasks List */}
          {!isLoading && !error && archivedTasks.length > 0 && (
            <div className="space-y-4">
              {archivedTasks.map((archivedTask, index) => (
                <div key={archivedTask.taskId} className="space-y-2">
                  {/* Archive metadata */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Archived on {formatArchiveDate(archivedTask.archivedAt)}</span>
                    {archivedTask.originalDate && (
                      <>
                        <span>•</span>
                        <span>Originally from {formatArchiveDate(archivedTask.originalDate)}</span>
                      </>
                    )}
                  </div>

                  {/* Archived task displayed as EditableScheduleRow */}
                  <EditableScheduleRow
                    task={archivedTask.task}
                    index={index}
                    onUpdateTask={handleUpdateTask}
                    moveTask={handleMoveTask}
                    isSection={false}
                    allTasks={archivedTasks.map(at => at.task)}
                    onEditTask={handleEditTask} // Maps to "Move to today"
                    onDeleteTask={handleDeleteTask} // Maps to "Delete permanently"
                    onArchiveTask={handleArchiveTask} // Disabled in archive context
                    customDropdownItems={createCustomDropdownItems(archivedTask)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bottom spacing */}
          <div className="h-16" />
        </div>
      </div>
    </SidebarLayout>
  )
}

export default ArchivePage
