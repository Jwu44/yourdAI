/**
 * @file ArchivedTaskItem.tsx
 * @description Component for displaying archived tasks with archive-specific actions
 */

import React, { useCallback } from 'react'
import { MoreHorizontal, Calendar, Trash2 } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Types
import { type Task } from '@/lib/types'

interface ArchivedTaskItemProps {
  task: Task
  onMoveToToday: () => void
  onDelete: () => void
}

/**
 * Get category color for task badges
 */
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Work': return 'bg-blue-500'
    case 'Fun': return 'bg-yellow-500'
    case 'Relationships': return 'bg-purple-500'
    case 'Ambition': return 'bg-orange-500'
    case 'Exercise': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

/**
 * ArchivedTaskItem Component
 * Displays an archived task with the same UI as dashboard tasks
 * but with different action menu options (Move to today, Delete)
 */
const ArchivedTaskItem: React.FC<ArchivedTaskItemProps> = ({
  task,
  onMoveToToday,
  onDelete
}) => {
  /**
   * Handle move to today action with delay for dropdown cleanup
   */
  const handleMoveToToday = useCallback(() => {
    setTimeout(() => {
      onMoveToToday()
    }, 50) // Small delay for dropdown overlay cleanup
  }, [onMoveToToday])

  /**
   * Handle delete action with delay for dropdown cleanup
   */
  const handleDelete = useCallback(() => {
    setTimeout(() => {
      onDelete()
    }, 50) // Small delay for dropdown overlay cleanup
  }, [onDelete])

  return (
    <div className="group gap-4 p-4 my-2 rounded-xl border border-border bg-card hover:bg-task-hover transition-all duration-200 shadow-soft">
      <div className="flex items-center justify-between">
        {/* Task Content */}
        <div className="flex-1">
          {/* Task Text */}
          <div className="flex-grow text-white mb-2">
            {task.text}
          </div>

          {/* Task Categories */}
          {task.categories && task.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.categories.map((category, index) => (
                <Badge
                  key={index}
                  className={`mr-1 mb-1 text-white ${getCategoryColor(category)}`}
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Task Timing (if available) */}
          {(task.start_time || task.end_time) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {task.start_time && (
                <span>{task.start_time}</span>
              )}
              {task.start_time && task.end_time && (
                <span>-</span>
              )}
              {task.end_time && (
                <span>{task.end_time}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions Dropdown */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                aria-label="Archived task actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleMoveToToday}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Move to today
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center gap-2 cursor-pointer text-destructive hover-selection"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export { ArchivedTaskItem }
