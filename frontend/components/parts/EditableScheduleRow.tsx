import React, { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import MicrostepSuggestions from '@/components/parts/MicrostepSuggestions'
import { TypographyH4 } from '../../app/fonts/text'
import { Sparkles, Loader2, MoreHorizontal, Pencil, Trash2, Archive, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForm } from '../../lib/FormContext'
import { useToast } from '@/hooks/use-toast'
import {
  type Task
} from '../../lib/types'
import {
  handleMicrostepDecomposition
} from '../../lib/helper'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Import our new drag drop hook
import { useDragDropTask } from '../../hooks/use-drag-drop-task'

interface CustomDropdownItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface EditableScheduleRowProps {
  task: Task
  index: number
  onUpdateTask: (task: Task) => void
  moveTask: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder', targetSection: string | null) => void
  isSection: boolean
  children?: React.ReactNode
  allTasks: Task[]
  onEditTask?: (task: Task) => void // New prop for edit functionality
  onDeleteTask?: (task: Task) => void // New prop for delete functionality
  onArchiveTask?: (task: Task) => void // New prop for archive functionality
  customDropdownItems?: CustomDropdownItem[] // Custom dropdown items for specific contexts
}

/**
 * Get custom emoji from localStorage
 */
const getCustomEmojis = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem('sectionCustomEmojis')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * Save custom emoji to localStorage
 */
const saveCustomEmoji = (sectionName: string, emoji: string) => {
  if (typeof window === 'undefined') return
  try {
    const customEmojis = getCustomEmojis()
    customEmojis[sectionName] = emoji
    localStorage.setItem('sectionCustomEmojis', JSON.stringify(customEmojis))
  } catch (error) {
    console.error('Failed to save custom emoji:', error)
  }
}

/**
 * Common emojis for quick selection
 */
const COMMON_EMOJIS = [
  '⚡️', '✏️', '☕️', '🌅', '🌆', '🎑', '🦕',
  '🎯', '💼', '🏠', '💪', '🧠', '❤️', '🎉',
  '📚', '🍎', '🚀', '⭐', '🔥', '💎', '🌟',
  '📝', '💻', '🎨', '🎵', '🏃', '🛏️', '🍽️'
]

/**
 * Simple emoji picker component using Popover
 */
interface EmojiPickerProps {
  currentEmoji: string
  onEmojiChange: (emoji: string) => void
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ currentEmoji, onEmojiChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleEmojiSelect = useCallback((emoji: string) => {
    onEmojiChange(emoji)
    setIsOpen(false)
  }, [onEmojiChange])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'text-lg cursor-pointer transition-all duration-200 select-none border-none bg-transparent p-1 rounded hover-selection',
            isHovered && 'scale-110'
          )}
          onMouseEnter={() => { setIsHovered(true) }}
          onMouseLeave={() => { setIsHovered(false) }}
          title="Click to change emoji"
        >
          {currentEmoji}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-7 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { handleEmojiSelect(emoji) }}
              className={cn(
                'w-8 h-8 flex items-center justify-center text-lg hover-selection rounded transition-colors',
                emoji === currentEmoji && 'selection-active'
              )}
              title={`Select ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Click any emoji to select it
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Get the appropriate emoji for a section based on its name
 * First checks for custom emojis, then falls back to hardcoded mapping
 */
const getSectionIcon = (sectionName: string, onEmojiChange?: (emoji: string) => void): React.ReactNode => {
  const customEmojis = getCustomEmojis()

  // Check for custom emoji first
  if (customEmojis[sectionName]) {
    return (
      <EmojiPicker
        currentEmoji={customEmojis[sectionName]}
        onEmojiChange={(emoji) => {
          saveCustomEmoji(sectionName, emoji)
          onEmojiChange?.(emoji)
        }}
      />
    )
  }

  const lowerName = sectionName.toLowerCase()
  let defaultEmoji = '🦕' // Default emoji

  // Priority-based sections
  if (lowerName.includes('high priority')) {
    defaultEmoji = '⚡️'
  } else if (lowerName.includes('medium priority')) {
    defaultEmoji = '✏️'
  } else if (lowerName.includes('low priority')) {
    defaultEmoji = '☕️'
  }
  // Time-based sections
  else if (lowerName.includes('morning')) {
    defaultEmoji = '🌅'
  } else if (lowerName.includes('afternoon') || lowerName.includes('arvo')) {
    defaultEmoji = '🌆'
  } else if (lowerName.includes('evening') || lowerName.includes('night')) {
    defaultEmoji = '🎑'
  }

  return (
    <EmojiPicker
      currentEmoji={defaultEmoji}
      onEmojiChange={(emoji) => {
        saveCustomEmoji(sectionName, emoji)
        onEmojiChange?.(emoji)
      }}
    />
  )
}

/**
 * EditableScheduleRow Component
 *
 * Renders a single task or section row with drag and drop functionality.
 *
 * Follows dev-guide principles:
 * - Simple implementation using @dnd-kit for drag and drop
 * - Modular architecture with clear separation of concerns
 * - Focus on rendering with drag logic handled by custom hooks
 *
 * Features:
 * - Drag and drop reordering with purple visual feedback
 * - Microstep decomposition for complex tasks
 * - Edit and delete actions
 * - Section and task rendering with proper styling
 * - Mobile-friendly touch support
 */
const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({
  task,
  index,
  onUpdateTask,
  moveTask,
  isSection,
  allTasks,
  onEditTask, // New prop for edit functionality
  onDeleteTask, // New prop for delete functionality
  onArchiveTask, // New prop for archive functionality
  customDropdownItems // Custom dropdown items for specific contexts
}) => {
  // Use our new drag drop hook instead of complex local state
  const dragDropHook = useDragDropTask({
    task,
    index,
    isSection,
    allTasks,
    moveTask
  })

  // Refs for DOM measurements (keep for compatibility)
  const checkboxRef = useRef<HTMLDivElement>(null)

  // New state for microsteps
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [suggestedMicrosteps, setSuggestedMicrosteps] = useState<Task[]>([])
  const [showMicrosteps, setShowMicrosteps] = useState(false)

  // Hooks
  const { state: formData } = useForm()
  const { toast } = useToast()

  // Can only decompose non-section, non-microstep, non-subtask tasks
  const canDecompose = !isSection && !task.is_microstep && !task.is_subtask

  // Add state for re-rendering when emoji changes
  const [, forceUpdate] = useState(0)

  // Callback to force re-render when emoji changes
  const handleEmojiChange = useCallback(() => {
    forceUpdate(prev => prev + 1)
  }, [])

  // Handlers for task operations
  const handleToggleComplete = useCallback((checked: boolean) => {
    onUpdateTask({
      ...task,
      completed: checked,
      categories: task.categories || []
    })
  }, [task, onUpdateTask])

  /**
   * Handle edit task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleEditTask = useCallback(() => {
    try {
      if (onEditTask) {
        // 🔧 FIX: Add small delay to allow dropdown overlay cleanup
        // This prevents race condition between dropdown and drawer overlays
        setTimeout(() => {
          onEditTask(task)
        }, 50) // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering edit task:', error)
      toast({
        title: 'Error',
        description: 'Failed to open edit dialog',
        variant: 'destructive'
      })
    }
  }, [task, onEditTask, toast])

  /**
   * Handle delete task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleDeleteTask = useCallback(() => {
    try {
      if (onDeleteTask) {
        // 🔧 FIX: Add small delay to allow dropdown overlay cleanup
        // This prevents race condition between dropdown overlays
        setTimeout(() => {
          onDeleteTask(task)
        }, 50) // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering delete task:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive'
      })
    }
  }, [task, onDeleteTask, toast])

  /**
   * Handle archive task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleArchiveTask = useCallback(() => {
    try {
      if (onArchiveTask) {
        // Add small delay to allow dropdown overlay cleanup
        setTimeout(() => {
          onArchiveTask(task)
        }, 50) // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering archive task:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive task',
        variant: 'destructive'
      })
    }
  }, [task, onArchiveTask, toast])

  // TODO: Remove old drag handlers - replaced by @dnd-kit hook
  // The old handlers (handleDragStart, handleDragOver, etc.) are no longer needed
  // @dnd-kit handles all drag events through the hook

  // Debug zones for simplified 2-zone system
  const getDebugZones = useCallback(() => {
    // Only show debug zones for non-section tasks during development
    if (isSection) return null

    const { cursorPosition, dragType, targetIndentLevel } = dragDropHook.indentationState

    return (
      <>
        {/* Left 10% zone (outdent/reorder) - RED background */}
        <div
          className="absolute top-0 bottom-0 bg-red-200 opacity-30 pointer-events-none"
          style={{ left: 0, width: '10%' }}
        />
        {/* Right 90% zone (indent) - GREEN background */}
        <div
          className="absolute top-0 bottom-0 bg-green-200 opacity-30 pointer-events-none"
          style={{ left: '10%', width: '90%' }}
        />
        {/* Zone boundary line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 opacity-70 pointer-events-none"
          style={{ left: '10%' }}
        />
        {/* Simplified drag type indicator */}
        {cursorPosition && (
          <div
            className="absolute top-1 right-1 px-2 py-1 bg-black text-white text-xs rounded opacity-80 pointer-events-none"
          >
            {dragType || 'none'} | L:{targetIndentLevel || 'none'}
          </div>
        )}
      </>
    )
  }, [isSection, dragDropHook.indentationState])

  // Progressive visual feedback system for indentation levels
  // Shows increasingly complex purple lines based on target indentation depth
  const getDragIndicators = useCallback(() => {
    // Only show indicators when this task is being hovered over as a drop target
    if (!dragDropHook.isOver || dragDropHook.isDragging || isSection) return null

    const { dragType, targetIndentLevel } = dragDropHook.indentationState
    const currentDragType = dragType || 'reorder'

    console.log('🎨 Visual indicator:', currentDragType, 'level:', targetIndentLevel, 'for', task.text)

    // Progressive opacity system based on requirements
    const renderProgressiveIndentLine = (levels: number) => {
      // Cap at 4 segments maximum as per requirements
      const segmentCount = Math.min(levels, 4)
      const segments = []

      // Always show dark purple (10%) + regular purple (90%) for any indent
      // For level 1: dark purple (10%) + regular purple (90%)
      // For level 2+: dark purple (10%) + progressive segments (90% split)
      const firstSegmentWidth = 10 // 10% for darkest
      const remainingWidth = 90 // 90% for remaining segments

      // Always have at least 2 segments total (dark + regular)
      const totalSegments = Math.max(segmentCount, 2)
      const otherSegmentWidth = remainingWidth / (totalSegments - 1)

      for (let i = 0; i < totalSegments; i++) {
        const isFirst = i === 0
        const width = isFirst ? firstSegmentWidth : otherSegmentWidth

        // Progressive opacity: darkest to lightest (using inline styles for dynamic values)
        const opacity = isFirst ? 0.9 : Math.max(0.6 - (i - 1) * 0.15, 0.6)
        const backgroundColor = isFirst ? '#7c3aed' : '#a855f7' // purple-600 : purple-500

        segments.push(
          <div
            key={i}
            style={{
              width: `${width}%`,
              backgroundColor,
              opacity
            }}
          />
        )
      }

      return (
        <div className="absolute right-0 left-0 h-1 bottom-[-1px] flex">
          {segments}
        </div>
      )
    }

    // Simplified visual feedback system
    switch (currentDragType) {
      case 'indent':
        // Progressive opacity based on target indent level
        const indentLevel = targetIndentLevel || 1
        return renderProgressiveIndentLine(indentLevel)

      case 'outdent':
        // Simple purple line for outdent
        return (
          <div className="absolute right-0 left-0 h-1 bg-purple-500 opacity-80 bottom-[-1px]" />
        )

      case 'reorder':
      default:
        // Simple purple line for reorder
        return (
          <div className="absolute right-0 left-0 h-1 bg-purple-500 opacity-60 bottom-[-1px]" />
        )
    }
  }, [dragDropHook.isOver, dragDropHook.isDragging, dragDropHook.indentationState.dragType, dragDropHook.indentationState.targetIndentLevel, isSection, task.text])

  /**
   * Handles task decomposition into microsteps
   *
   * Uses the AI service to break down a task into smaller, more manageable steps
   * and presents them to the user for selection.
   */
  const handleDecompose = useCallback(async () => {
    // Guard clause - only proceed if decomposition is allowed and not already in progress
    if (!canDecompose || isDecomposing) return

    try {
      // Set loading state and clear any existing microsteps
      setIsDecomposing(true)
      setShowMicrosteps(false)

      // Get microstep texts from backend
      const microstepTexts = await handleMicrostepDecomposition(task, formData)

      // Convert microstep texts into full Task objects
      // Updated to handle both string array and object array responses
      const microstepTasks = microstepTexts.map((step: string | {
        text: string
        rationale?: string
        estimated_time?: string
        energy_level_required?: 'low' | 'medium' | 'high'
      }) => {
        // Handle both string and object formats
        const isObject = typeof step !== 'string'
        const text = isObject ? step.text : step
        const rationale = isObject ? step.rationale : undefined
        const estimatedTime = isObject ? step.estimated_time : undefined
        const energyLevel = isObject ? step.energy_level_required : undefined

        return {
          id: crypto.randomUUID(), // Generate unique ID for each microstep
          text, // The microstep text
          rationale, // Store explanation if available
          estimated_time: estimatedTime, // Store time estimate if available
          energy_level_required: energyLevel, // Store energy level if available
          is_microstep: true, // Mark as microstep
          completed: false,
          is_section: false,
          section: task.section, // Inherit section from parent
          parent_id: task.id, // Link to parent task
          level: (task.level || 0) + 1, // Indent one level from parent
          type: 'microstep',
          categories: task.categories || [], // Inherit categories from parent
          // Add layout-related information for proper rendering
          section_index: 0 // Will be recalculated when added to schedule
        }
      })

      // Update UI with new microsteps
      setSuggestedMicrosteps(microstepTasks)
      setShowMicrosteps(true)

      // Show success message
      toast({
        title: 'Success',
        description: 'Select which microsteps to add'
      })
    } catch (error) {
      // Handle and display any errors
      console.error('Error decomposing task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to decompose task',
        variant: 'destructive'
      })
    } finally {
      // Reset loading state regardless of outcome
      setIsDecomposing(false)
    }
  }, [canDecompose, task, formData, toast, isDecomposing])

  /**
   * Handles user acceptance of a suggested microstep
   *
   * Converts a microstep suggestion into an actual task and adds it to the schedule
   * Preserves layout information and parent-child relationships.
   *
   * @param microstep - The microstep suggestion to convert to a task
   */
  const handleMicrostepAccept = useCallback(async (microstep: Task) => {
    try {
      // Create a new task object with all required properties for a subtask
      const newSubtask: Task = {
        ...microstep,
        id: crypto.randomUUID(), // Generate new ID for the actual task
        is_subtask: true,
        parent_id: task.id, // Link to parent task
        level: (task.level || 0) + 1, // Indent one level from parent
        section: task.section, // Inherit section from parent
        categories: task.categories || [], // Inherit categories from parent
        completed: false,
        is_section: false,
        type: 'task', // Change type from 'microstep' to 'task'
        start_time: null,
        end_time: null,
        is_recurring: null,
        section_index: 0, // Will be recalculated by EditableSchedule
        // Include additional properties from the microstep if available
        rationale: microstep.rationale || task.rationale,
        estimated_time: microstep.estimated_time || task.estimated_time,
        energy_level_required: microstep.energy_level_required || task.energy_level_required
      }

      // Call the main onUpdateTask function which will handle the task creation
      onUpdateTask(newSubtask)

      // Remove the microstep from suggestions
      setSuggestedMicrosteps(prev => prev.filter(step => step.id !== microstep.id))

      // Close suggestions panel when all microsteps are handled
      if (suggestedMicrosteps.length <= 1) {
        setShowMicrosteps(false)
      }

      // Show success toast
      toast({
        title: 'Success',
        description: 'Microstep added to schedule'
      })
    } catch (error) {
      console.error('Error accepting microstep:', error)
      toast({
        title: 'Error',
        description: 'Failed to add microstep to schedule',
        variant: 'destructive'
      })
    }
  }, [task, onUpdateTask, suggestedMicrosteps.length, toast])

  // Update the handleMicrostepReject to simply remove the suggestion
  const handleMicrostepReject = useCallback((microstep: Task) => {
    // Remove the rejected microstep from suggestions
    setSuggestedMicrosteps(prev => prev.filter(step => step.id !== microstep.id))

    // Close suggestions panel when all microsteps are handled
    if (suggestedMicrosteps.length <= 1) {
      setShowMicrosteps(false)
    }
  }, [suggestedMicrosteps.length])

  // Enhanced task actions with decompose button and ellipses dropdown
  const renderTaskActions = () => (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Decompose button - existing functionality */}
      {canDecompose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecompose}
          disabled={isDecomposing}
          className="h-8 w-8 p-0 gradient-accent hover:opacity-90 text-primary-foreground hover:scale-105 transition-all duration-200"
        >
          {isDecomposing
            ? (
            <Loader2 className="h-4 w-4 animate-spin" />
              )
            : (
            <Sparkles className="h-4 w-4 animate-sparkle" />
              )}
        </Button>
      )}

      {/* Ellipses dropdown menu - new functionality */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            aria-label="Task actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {customDropdownItems ? (
            // Use custom dropdown items when provided
            customDropdownItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={item.onClick}
                className={`flex items-center gap-2 cursor-pointer ${
                  item.variant === 'destructive' ? 'text-destructive hover-selection' : ''
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            ))
          ) : (
            // Default dropdown items
            <>
              <DropdownMenuItem
                onClick={handleEditTask}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {/* Archive option - only show for non-section tasks */}
              {!isSection && !task.is_section && onArchiveTask && (
                <DropdownMenuItem
                  onClick={handleArchiveTask}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDeleteTask}
                className="flex items-center gap-2 cursor-pointer text-destructive hover-selection"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <div
        ref={dragDropHook.setNodeRef}
        {...dragDropHook.attributes}
        data-task-level={task.level || 0}
        data-sortable-id={task.id}
        className={cn(
          dragDropHook.getRowClassName(),
          isSection ? 'cursor-default' : '',
          isDecomposing && 'animate-pulse',
          // Section styling
          isSection ? 'mt-6 mb-4'
          // Task card styling following TaskList.tsx reference
            : 'group gap-4 p-4 my-2 rounded-xl border border-border bg-card hover:bg-task-hover transition-all duration-200 shadow-soft'
        )}
        style={{
          marginLeft: (task.level && task.level > 0) ? `${task.level * 30}px` : 0,
          minHeight: isSection ? '48px' : 'auto',
          transform: dragDropHook.transform, // Only applies to actively dragged items
          // 🔧 FIX: Prevent shuffling - only dragged items get transform optimization
          willChange: dragDropHook.isDragging ? 'transform' : 'auto',
          // Only disable transitions for the actively dragged item
          transition: dragDropHook.isDragging ? 'none' : undefined
        }}
        onMouseEnter={(e) => {
          // 🔧 FIX: Only track cursor position when this task is a drop target (isOver)
          // This ensures we track position relative to the TARGET task, not dragged task
          if (dragDropHook.isOver && !dragDropHook.isDragging) {
            console.log('🔵 MouseEnter on TARGET task:', task.text)
            dragDropHook.updateCursorPosition(e.clientX, e.clientY, e.currentTarget as HTMLElement)
          }
        }}
        onMouseMove={(e) => {
          // 🔧 FIX: Only track cursor position when this task is a drop target (isOver)
          // This enables real-time drag type updates relative to the TARGET task
          if (dragDropHook.isOver && !dragDropHook.isDragging) {
            console.log('🔵 MouseMove on TARGET task:', task.text, 'at', e.clientX)
            dragDropHook.updateCursorPosition(e.clientX, e.clientY, e.currentTarget as HTMLElement)
          }
        }}
      >
        {/* Task/Section Content */}
        {!isSection && (
          <>
            {/* Drag Handle - only visible on hover */}
            <div
              className={dragDropHook.getGripClassName()}
              {...dragDropHook.listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </div>

            <div ref={checkboxRef} className="flex items-center">
              {task.level && task.level > 0 && (
                <div className="relative mr-2 flex items-center">
                  {/* Connecting line extending from parent */}
                  <div
                    className="border-l border-b border-muted-foreground/30"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderBottomLeftRadius: '4px'
                    }}
                  />
                </div>
              )}
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200"
              />
            </div>
          </>
        )}

        {isSection
          ? (
          <div className="flex items-center gap-3 px-4 py-3">
            {getSectionIcon(task.text, handleEmojiChange)}
            <TypographyH4 className="text-foreground font-semibold mb-0">
              {task.text}
            </TypographyH4>
          </div>
            )
          : (
          <span
            className={cn(
              'flex-1 text-foreground transition-all duration-200',
              task.completed && 'line-through text-muted-foreground'
            )}
            data-task-content="true"
          >
            {task.start_time && task.end_time
              ? `${task.start_time} - ${task.end_time}: `
              : ''}
            {task.text}
          </span>
            )}

        {/* Task Actions - only show for non-section tasks */}
        {!isSection && renderTaskActions()}

        {/* 🐛 DEBUG: Visual threshold zones */}
        {getDebugZones()}

        {/* Enhanced Drag Indicators */}
        {getDragIndicators()}
      </div>

      {/* Microstep Suggestions */}
      {showMicrosteps && suggestedMicrosteps.length > 0 && (
        <MicrostepSuggestions
          microsteps={suggestedMicrosteps}
          onAccept={handleMicrostepAccept}
          onReject={handleMicrostepReject}
          className="mt-2"
        />
      )}
    </motion.div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(EditableScheduleRow)
