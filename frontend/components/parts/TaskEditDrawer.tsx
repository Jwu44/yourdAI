import React, { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'
import {
  type Task,
  type RecurrenceType,
  type WeekDay,
  type MonthWeek,
  RECURRENCE_OPTIONS
} from '../../lib/types'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface TaskEditDrawerProps {
  isOpen: boolean
  onClose: () => void
  task?: Task // When provided, enables edit mode
  onUpdateTask?: (task: Task) => void // For edit mode
  onCreateTask?: (task: Task) => void // For create mode
  currentDate: string
}

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work']

const TaskEditDrawer: React.FC<TaskEditDrawerProps> = ({
  isOpen,
  onClose,
  task, // Re-enabled for edit mode
  onUpdateTask, // Re-enabled for edit mode
  onCreateTask,
  currentDate
}) => {
  // Determine mode based on presence of task prop
  const isEditMode = Boolean(task)

  // Initialize task state with all required fields
  const getEmptyTask = useCallback((): Task => ({
    id: '',
    text: '',
    type: 'task',
    is_section: false,
    categories: [],
    start_time: '',
    end_time: '',
    is_recurring: null,
    completed: false,
    is_subtask: false,
    section: null,
    parent_id: null,
    level: 0,
    section_index: 0,
    start_date: currentDate
  }), [currentDate])

  // Initialize with task data in edit mode, empty task in create mode
  const getInitialTask = useCallback((): Task => {
    if (isEditMode && task) {
      return {
        ...task,
        // Ensure all required fields are present with proper defaults
        start_time: task.start_time || '',
        end_time: task.end_time || '',
        categories: task.categories || [],
        start_date: task.start_date || currentDate
      }
    }
    return getEmptyTask()
  }, [isEditMode, task, getEmptyTask, currentDate])

  const [editedTask, setEditedTask] = useState<Task>(() => getInitialTask())

  // Reset form when drawer is opened/closed or task changes
  useEffect(() => {
    if (isOpen) {
      setEditedTask(getInitialTask())
    }
  }, [isOpen, task, getInitialTask])

  // Get current day of week from current date
  const getCurrentDayOfWeek = useCallback((): WeekDay => {
    try {
      const date = new Date()
      return format(date, 'EEEE') as WeekDay
    } catch (error) {
      console.error('Error getting day of week:', error)
      return format(new Date(), 'EEEE') as WeekDay
    }
  }, [])

  // Get week of month (first, second, third, fourth, last)
  const getWeekOfMonth = useCallback((): MonthWeek => {
    try {
      const date = new Date()
      const dayOfMonth = date.getDate()

      if (dayOfMonth >= 1 && dayOfMonth <= 7) return 'first'
      if (dayOfMonth >= 8 && dayOfMonth <= 14) return 'second'
      if (dayOfMonth >= 15 && dayOfMonth <= 21) return 'third'
      if (dayOfMonth >= 22 && dayOfMonth <= 28) return 'fourth'
      return 'last'
    } catch (error) {
      console.error('Error getting week of month:', error)
      return 'first'
    }
  }, [])

  // Format recurrence label with current day/week
  const getRecurrenceLabel = useCallback((option: typeof RECURRENCE_OPTIONS[0]): string => {
    try {
      if (option.value === 'weekly') {
        return option.label.replace('{day}', getCurrentDayOfWeek())
      }
      if (option.value === 'monthly') {
        return option.label
          .replace('{week}', getWeekOfMonth())
          .replace('{day}', getCurrentDayOfWeek())
      }
      return option.label
    } catch (error) {
      console.error('Error formatting recurrence label:', error)
      return option.label
    }
  }, [getCurrentDayOfWeek, getWeekOfMonth])

  // Handle input changes for text fields
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedTask(prev => ({ ...prev, [name]: value }))
  }, [])

  // Handle category selection
  const handleCategorySelect = useCallback((category: string) => {
    setEditedTask(prev => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...(prev.categories || []), category]
    }))
  }, [])

  // Handle recurrence selection
  const handleRecurrenceChange = useCallback((value: string) => {
    try {
      if (value === 'none') {
        setEditedTask(prev => ({
          ...prev,
          is_recurring: null
        }))
        return
      }

      const recurrence: RecurrenceType = {
        frequency: value as RecurrenceType['frequency'],
        dayOfWeek: getCurrentDayOfWeek(),
        weekOfMonth: value === 'monthly' ? getWeekOfMonth() : undefined
      }

      setEditedTask(prev => ({
        ...prev,
        is_recurring: recurrence
      }))
    } catch (error) {
      console.error('Error setting recurrence:', error)
      setEditedTask(prev => ({
        ...prev,
        is_recurring: null
      }))
    }
  }, [getCurrentDayOfWeek, getWeekOfMonth])

  // Get category variant based on category name
  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'Work':
        return 'work'
      case 'Fun':
        return 'fun'
      case 'Relationships':
        return 'relationships'
      case 'Ambition':
        return 'ambition'
      case 'Exercise':
        return 'exercise'
      default:
        return undefined
    }
  }

  // Add proper error boundary handling
  const validateTaskData = useCallback((task: Task): boolean => {
    try {
      // Validate required fields following task.py schema
      if (!task.text?.trim()) {
        throw new Error('Task name is required')
      }

      // Validate categories format
      if (task.categories && !Array.isArray(task.categories)) {
        throw new Error('Categories must be an array')
      }

      return true
    } catch (error) {
      console.error('Task validation error:', error)
      return false
    }
  }, [])

  // Update handleSave with validation
  const handleSave = useCallback(async () => {
    try {
      // Validate before save
      if (!validateTaskData(editedTask)) {
        return
      }

      if (isEditMode && onUpdateTask) {
        // Edit mode: update existing task
        await onUpdateTask({
          ...editedTask,
          id: task?.id || editedTask.id
        })
      } else if (!isEditMode && onCreateTask) {
        // Create mode: create new task
        await onCreateTask({
          ...editedTask,
          id: ''
        })
      }

      // Reset form state and close drawer after successful save
      setEditedTask(getInitialTask())

      // Close the drawer after successful save
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      toast({
        title: 'Error',
        description: 'Failed to save task. Please try again.',
        variant: 'destructive'
      })
      // Don't close drawer on error - let user retry
    }
  }, [editedTask, isEditMode, onUpdateTask, onCreateTask, task?.id, getInitialTask, validateTaskData, toast])

  // Handle close with form reset
  const handleClose = useCallback(() => {
    setEditedTask(getInitialTask())
    onClose()
  }, [onClose, getInitialTask])

  // 🔧 FIXED: Let vaul handle close via onOpenChange when save completes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose()
    }
  }, [handleClose])

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleOpenChange} // 🔧 FIXED: Single source of truth for close
      modal={true}
    >
      <DrawerContent
        className="fixed bottom-0 left-0 right-0 h-[75vh] w-full bg-background shadow-lg outline-none"
        onPointerDownOutside={(e) => {
          // Allow time picker interactions - check if click is on time input or its picker
          const target = e.target as HTMLElement

          // Don't close drawer if clicking on time inputs, their pickers, or select dropdowns
          if (target?.closest('input[type="time"]') ||
              target?.closest('.time-input-custom') ||
              target?.closest('[data-radix-popper-content-wrapper]') ||
              target?.closest('[data-radix-select-content]')) {
            return
          }

          // Only prevent closing if user has unsaved changes
          const hasUnsavedChanges = editedTask.text !== (task?.text || '')
          if (hasUnsavedChanges) {
            e.preventDefault()
            return
          }
          handleClose()
        }}
      >
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>
              {isEditMode ? 'Edit Task' : 'Create Task'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {/* Task Name */}
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-foreground">
                Task Name
              </label>
              <Input
                id="text"
                name="text"
                value={editedTask.text}
                onChange={handleInputChange}
                onKeyDown={async (e) => await (e.key === 'Enter' && handleSave())}
                className="mt-1"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const isSelected = editedTask.categories?.includes(category)
                  return (
                    <Badge
                      key={category}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer',
                        isSelected && getCategoryVariant(category) === 'work' && 'bg-info btn-hover-primary',
                        isSelected && getCategoryVariant(category) === 'fun' && 'bg-warning btn-hover-primary',
                        isSelected && getCategoryVariant(category) === 'relationships' && 'bg-primary btn-hover-primary',
                        isSelected && getCategoryVariant(category) === 'ambition' && 'bg-warning btn-hover-primary',
                        isSelected && getCategoryVariant(category) === 'exercise' && 'bg-success btn-hover-primary',
                        !isSelected && 'bg-secondary text-secondary-foreground btn-hover-secondary'
                      )}
                      onClick={() => { handleCategorySelect(category) }}
                    >
                      {category}
                      {isSelected && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Time Fields */}
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-foreground">
                Start Time
              </label>
              <div
                className="relative"
                onPointerDown={(e) => {
                  // Prevent drawer from closing when interacting with time input
                  e.stopPropagation()
                }}
              >
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={editedTask.start_time || ''}
                  onChange={handleInputChange}
                  onKeyDown={async (e) => await (e.key === 'Enter' && handleSave())}
                  onClick={(e) => {
                    // Try to trigger time picker on click
                    e.currentTarget.showPicker?.()
                  }}
                  className="mt-1 w-full font-mono text-center time-input-custom"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-foreground">
                End Time
              </label>
              <div
                className="relative"
                onPointerDown={(e) => {
                  // Prevent drawer from closing when interacting with time input
                  e.stopPropagation()
                }}
              >
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={editedTask.end_time || ''}
                  onChange={handleInputChange}
                  onKeyDown={async (e) => await (e.key === 'Enter' && handleSave())}
                  onClick={(e) => {
                    // Try to trigger time picker on click
                    e.currentTarget.showPicker?.()
                  }}
                  className="mt-1 w-full font-mono text-center time-input-custom"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Recurrence Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Repeat every...
              </label>
              <Select
                value={
                  editedTask.is_recurring?.frequency ?? 'none'
                }
                onValueChange={handleRecurrenceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent className="select-content bg-background">
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                    >
                      {getRecurrenceLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer with improved save button */}
          <DrawerFooter>
            <Button onClick={handleSave} className="gradient-accent hover:opacity-90 text-primary-foreground">
              {isEditMode ? 'Save Changes' : 'Create'}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default TaskEditDrawer
