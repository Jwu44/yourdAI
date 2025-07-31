import React, { useMemo, useCallback } from 'react'
import { Pane } from 'evergreen-ui'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import EditableScheduleRow from './EditableScheduleRow'
import AISuggestionsList from './AISuggestionsList'
import { useDragDropProvider } from '../../hooks/use-drag-drop-provider'
import {
  type Task,
  type AISuggestion
} from '../../lib/types'

/**
 * Props interface for the EditableSchedule component
 */
interface EditableScheduleProps {
  /** Tasks to display in the schedule - pre-structured by optimized backend */
  tasks: Task[]

  /** Callback function for updating a task */
  onUpdateTask: (task: Task) => void

  /** Callback function for reordering tasks */
  onReorderTasks: (tasks: Task[]) => void

  /** Callback function to request AI suggestions */
  onRequestSuggestions: () => Promise<void>

  /** Flag indicating if suggestions are being loaded */
  isLoadingSuggestions: boolean

  /** Map of task IDs to associated AI suggestions */
  suggestionsMap: Map<string, AISuggestion[]>

  /** Callback function for accepting a suggestion */
  onAcceptSuggestion: (suggestion: AISuggestion) => void

  /** Callback function for rejecting a suggestion */
  onRejectSuggestion: (suggestionId: string) => void

  /** Callback function for editing a task */
  onEditTask?: (task: Task) => void

  /** Callback function for deleting a task */
  onDeleteTask?: (task: Task) => void

  /** Callback function for archiving a task */
  onArchiveTask?: (task: Task) => void
}

/**
 * Simplified EditableSchedule component for direct rendering of optimized backend data
 *
 * This component now focuses purely on rendering pre-structured tasks from the optimized
 * backend, eliminating the need for complex layout processing that was previously handled
 * by ScheduleHelper.
 */
const EditableSchedule: React.FC<EditableScheduleProps> = ({
  tasks,
  onUpdateTask,
  onReorderTasks,
  onRequestSuggestions,
  isLoadingSuggestions,
  suggestionsMap,
  onAcceptSuggestion,
  onRejectSuggestion,
  onEditTask,
  onDeleteTask,
  onArchiveTask
}) => {
  /**
   * Tasks are now pre-processed by the optimized backend
   * We can render them directly without complex layout logic
   */
  const processedTasks = useMemo(() => {
    return tasks
  }, [tasks])

  /**
   * Enhanced moveTask function to handle task reordering with proper indentation
   *
   * 🔧 FIX: Updated to properly handle indent/outdent operations based on cursor position
   * - Indent: Insert directly after target task at target's level + 1
   * - Outdent: Move to same level as parent task and position below parent
   * - Reorder: Simple position change without level modification
   *
   * This maintains the existing drag-and-drop functionality while working with
   * the optimized backend structure.
   */
  const moveTask = useCallback((
    dragIndex: number,
    hoverIndex: number,
    dragType: 'indent' | 'outdent' | 'reorder' | 'indent_to_parent_level' | 'indent_to_child_level',
    targetSection: string | null
  ) => {
    try {
      // Validate indices
      if (dragIndex < 0 || dragIndex >= processedTasks.length ||
          hoverIndex < 0 || hoverIndex >= processedTasks.length) {
        console.error('Invalid drag/hover indices:', { dragIndex, hoverIndex, tasksLength: processedTasks.length })
        return
      }

      const draggedTask = { ...processedTasks[dragIndex] }
      const newTasks = processedTasks.filter((_, index) => index !== dragIndex)

      if (targetSection) {
      // Moving to a section
        const sectionIndex = newTasks.findIndex(task =>
          task.is_section && task.text === targetSection
        )

        if (sectionIndex !== -1) {
          newTasks.splice(sectionIndex + 1, 0, {
            ...draggedTask,
            section: targetSection,
            is_subtask: false,
            level: 0,
            parent_id: null,
            categories: [targetSection]
          })
        } else {
          newTasks.push({
            ...draggedTask,
            section: targetSection,
            is_subtask: false,
            level: 0,
            parent_id: null,
            categories: [targetSection]
          })
        }
      } else {
      // Regular task reordering
        const targetTask = processedTasks[hoverIndex]
        const updatedDraggedTask = { ...draggedTask }

        if (dragType === 'indent' && !targetTask.is_section) {
        // 🔧 FIX: Indent - Insert directly after target task at target's level + 1
          const newLevel = Math.min((targetTask.level || 0) + 1, 3)

          updatedDraggedTask.is_subtask = newLevel > 0
          updatedDraggedTask.level = newLevel
          updatedDraggedTask.parent_id = targetTask.id
          updatedDraggedTask.section = targetTask.section

          // Insert directly after the target task (requirement clarification #1)
          const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
          newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)
        } else if (dragType === 'outdent' && !targetTask.is_section) {
        // 🔧 FIX: Outdent - Move to same level as parent task and sit below parent
        // Find the parent task if current task is indented
          const currentTaskLevel = draggedTask.level || 0

          if (currentTaskLevel > 0) {
          // Find the parent task
            const parentTask = processedTasks.find(t => t.id === draggedTask.parent_id)

            if (parentTask) {
            // Move to same level as parent (requirement clarification #2)
              const newLevel = parentTask.level || 0

              updatedDraggedTask.is_subtask = newLevel > 0
              updatedDraggedTask.level = newLevel
              updatedDraggedTask.parent_id = parentTask.parent_id
              updatedDraggedTask.section = parentTask.section

              // Find position to insert after parent (below parent task)
              const parentIndex = newTasks.findIndex(t => t.id === parentTask.id)
              if (parentIndex !== -1) {
                newTasks.splice(parentIndex + 1, 0, updatedDraggedTask)
              } else {
              // Fallback: insert at hover position
                newTasks.splice(hoverIndex, 0, updatedDraggedTask)
              }
            } else {
            // No parent found, move to level 0
              updatedDraggedTask.is_subtask = false
              updatedDraggedTask.level = 0
              updatedDraggedTask.parent_id = null
              updatedDraggedTask.section = targetTask.section

              newTasks.splice(hoverIndex, 0, updatedDraggedTask)
            }
          } else {
          // Already at level 0, just reorder
            newTasks.splice(hoverIndex, 0, updatedDraggedTask)
          }
        } else if (dragType === 'indent_to_parent_level' && !targetTask.is_section) {
        // 🔧 NEW: Indent to parent level - Task goes at target's parent level, positioned after target
        // This handles the 30-60% zone for 3-zone system
          try {
            const targetLevel = targetTask.level || 0
            const targetParentTask = processedTasks.find(t => t.id === targetTask.parent_id)

            if (targetLevel > 0 && targetParentTask) {
            // Set task to same level as target's parent
              const newLevel = targetParentTask.level || 0

              updatedDraggedTask.is_subtask = newLevel > 0
              updatedDraggedTask.level = newLevel
              updatedDraggedTask.parent_id = targetParentTask.parent_id
              updatedDraggedTask.section = targetTask.section

              // Insert immediately after target task (as per requirement clarification)
              const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
              newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)

              console.log('✅ indent_to_parent_level: Task moved to parent level', {
                taskId: draggedTask.id,
                newLevel,
                targetParentId: targetParentTask.id
              })
            } else {
            // Target has no parent, fallback to child level behavior (as per dev-guide error handling)
              const newLevel = Math.min(targetLevel + 1, 3)

              updatedDraggedTask.is_subtask = newLevel > 0
              updatedDraggedTask.level = newLevel
              updatedDraggedTask.parent_id = targetTask.id
              updatedDraggedTask.section = targetTask.section

              const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
              newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)

              console.log('✅ indent_to_parent_level fallback: Used child level behavior', {
                taskId: draggedTask.id,
                newLevel
              })
            }
          } catch (error) {
            console.error('Error in indent_to_parent_level operation:', error)
            // Fallback to simple reorder on error
            newTasks.splice(hoverIndex, 0, updatedDraggedTask)
          }
        } else if (dragType === 'indent_to_child_level' && !targetTask.is_section) {
        // 🔧 NEW: Indent to child level - Task goes at target's level + 1, positioned after target
        // This handles the 60-100% zone for 3-zone system
          try {
            const targetLevel = targetTask.level || 0
            const newLevel = Math.min(targetLevel + 1, 3)

            updatedDraggedTask.is_subtask = newLevel > 0
            updatedDraggedTask.level = newLevel
            updatedDraggedTask.parent_id = targetTask.id
            updatedDraggedTask.section = targetTask.section

            // Insert directly after target task (as per requirement clarification)
            const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
            newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)

            console.log('✅ indent_to_child_level: Task indented under target', {
              taskId: draggedTask.id,
              newLevel,
              parentId: targetTask.id
            })
          } catch (error) {
            console.error('Error in indent_to_child_level operation:', error)
            // Fallback to simple reorder on error
            newTasks.splice(hoverIndex, 0, updatedDraggedTask)
          }
        } else {
          if (targetTask.is_section) {
            newTasks.splice(hoverIndex + 1, 0, {
              ...updatedDraggedTask,
              is_subtask: false,
              level: 0,
              parent_id: null,
              section: targetTask.text,
              categories: [targetTask.text]
            })
          } else {
            // 🔧 FIX: Reorder - Always inherit target's section and reset to target's level
            // This fixes cross-section reordering where tasks weren't moving to the target section
            const targetLevel = targetTask.level || 0

            // 🔧 FIX: Use consistent pattern from working indent operations
            // Insert after target task (adjustedHoverIndex + 1)
            const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex

            newTasks.splice(adjustedHoverIndex + 1, 0, {
              ...updatedDraggedTask,
              section: targetTask.section,
              is_subtask: targetLevel > 0,
              level: targetLevel,
              parent_id: targetTask.parent_id
            })
          }
        }
      }

      // Update section indices after reordering
      const updateSectionIndices = (tasks: Task[]): Task[] => {
        let currentSectionStartIndex = 0

        return tasks.map((task, index) => {
          if (task.is_section) {
            currentSectionStartIndex = index
            return { ...task, section_index: 0 }
          }
          return {
            ...task,
            section_index: index - currentSectionStartIndex
          }
        })
      }

      const finalTasks = updateSectionIndices(newTasks)
      onReorderTasks(finalTasks)
    } catch (error) {
      console.error('Error in moveTask:', error)
      // Don't update tasks if there's an error - maintain current state
    }
  }, [processedTasks, onReorderTasks])

  // Use our drag drop provider hook (after moveTask is defined)
  const dragDropProvider = useDragDropProvider({
    tasks,
    onReorderTasks,
    moveTask
  })

  /**
   * Log optimization status for debugging
   */
  React.useEffect(() => {
    const hasOptimizedStructure = tasks.some(task =>
      task.is_section === true || (task.section && typeof task.section === 'string')
    )

    if (hasOptimizedStructure) {
      console.log('✅ Rendering optimized backend structure')
    } else {
      console.log('⚠️ Rendering legacy structure')
    }
  }, [tasks])

  return (
    <DndContext
      sensors={dragDropProvider.sensors}
      collisionDetection={dragDropProvider.collisionDetection}
      onDragStart={dragDropProvider.onDragStart}
      onDragOver={dragDropProvider.onDragOver}
      onDragMove={dragDropProvider.onDragMove}
      onDragEnd={dragDropProvider.onDragEnd}
    >
      <SortableContext
        items={dragDropProvider.items}
        strategy={dragDropProvider.strategy}
      >
        <Pane>
          {/* Direct rendering of pre-structured tasks */}
          {processedTasks.map((task, index) => (
            <React.Fragment key={`${task.id}-${task.type || 'task'}`}>
              <EditableScheduleRow
                task={task}
                index={index}
                onUpdateTask={onUpdateTask}
                moveTask={moveTask}
                isSection={task.is_section || task.type === 'section'}
                allTasks={processedTasks}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onArchiveTask={onArchiveTask}
              />

              {/* Render suggestions after each task if they exist */}
              {suggestionsMap.has(task.id) && (
                <div className="suggestion-container">
                  <AISuggestionsList
                    suggestions={suggestionsMap.get(task.id) || []}
                    onAccept={onAcceptSuggestion}
                    onReject={onRejectSuggestion}
                    className="suggestion-list"
                  />
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Render suggestions for schedule start if they exist */}
          {suggestionsMap.has('schedule-start') && (
            <div className="schedule-start-container">
              <AISuggestionsList
                suggestions={suggestionsMap.get('schedule-start') || []}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
                className="suggestion-list"
              />
            </div>
          )}
        </Pane>
      </SortableContext>
    </DndContext>
  )
}

export default React.memo(EditableSchedule)
