import { useCallback, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { type Task } from '../lib/types'

/**
 * Custom hook for task drag and drop functionality
 * 
 * Follows dev-guide principles:
 * - Simple implementation using @dnd-kit
 * - Modular architecture with clear separation of concerns
 * - TypeScript strict mode with proper interfaces
 * - Optimized transforms for smooth horizontal dragging
 * - Enhanced with Notion-style indentation detection
 */

interface UseDragDropTaskProps {
  task: Task
  index: number
  isSection: boolean
  allTasks: Task[]
  moveTask: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder', targetSection: string | null) => void
}

// Simplified state for indentation detection
interface IndentationState {
  dragType: 'indent' | 'outdent' | 'reorder'
  cursorPosition: { x: number; y: number } | null
  targetTaskLeftEdge: number | null
  containerWidth?: number
  targetIndentLevel?: number // Track target indent level for progressive visual feedback
}

interface DragDropTaskReturn {
  // @dnd-kit sortable props - properly typed instead of 'any'
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  setNodeRef: (node: HTMLElement | null) => void
  transform: string | undefined
  
  // Custom drag state
  isDragging: boolean
  isOver: boolean
  
  // Enhanced indentation state
  indentationState: IndentationState
  
  // Visual feedback helpers
  getRowClassName: () => string
  getGripClassName: () => string
  
  // Cursor tracking for indentation
  updateCursorPosition: (x: number, y: number, targetElement?: HTMLElement) => void
}

/**
 * Hook that provides drag and drop functionality for task rows
 * 🔧 FIX: Optimized for smooth horizontal and vertical dragging performance
 * ✨ NEW: Enhanced with Notion-style indentation detection based on cursor position
 */
export const useDragDropTask = ({
  task,
  index,
  isSection,
  allTasks,
  moveTask
}: UseDragDropTaskProps): DragDropTaskReturn => {
  
  // State for tracking indentation intentions
  // 🔧 FIX: Initialize with 'reorder' as default to ensure purple bar always shows
  const [indentationState, setIndentationState] = useState<IndentationState>({
    dragType: 'reorder',
    cursorPosition: null,
    targetTaskLeftEdge: null
  })

  // Cursor tracking for indentation detection - defined before useSortable
  const updateCursorPosition = useCallback((x: number, y: number, targetElement?: HTMLElement) => {
    try {
      // Dev-Guide: Proper error handling - validate coordinates first
      if (isNaN(x) || isNaN(y) || x === undefined || y === undefined) {
        console.warn('🚫 Invalid coordinates received in updateCursorPosition:', { x, y, taskText: task.text });
        return;
      }

      console.log('🔧 updateCursorPosition called:', { x, y, hasTarget: !!targetElement, taskText: task.text });
      
      if (!targetElement || isSection) {
        // Reset state if no target or target is section
        // 🔧 FIX: Use 'reorder' instead of null to ensure purple bar shows
        console.log('🔧 Resetting to reorder - no target or is section');
        setIndentationState({
          dragType: 'reorder',
          cursorPosition: null,
          targetTaskLeftEdge: null,
          containerWidth: undefined,
          targetIndentLevel: undefined
        });
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const targetTask = targetElement.getAttribute('data-task-level');
      const targetLevel = targetTask ? parseInt(targetTask, 10) : 0;
      
      console.log('🔧 Target element details:', {
        targetRect,
        width: targetRect.width,
        height: targetRect.height,
        left: targetRect.left,
        right: targetRect.right,
        targetLevel,
        elementTagName: targetElement.tagName,
        elementClasses: targetElement.className
      });
      
      // 🔧 FIX: Percentage-based threshold calculation for reliable positioning
      // Following dev-guide principle: keep implementation SIMPLE
      
      // Use the entire visible task container for percentage calculation
      const containerLeft = targetRect.left;
      const containerWidth = targetRect.width;
      const containerRight = containerLeft + containerWidth;
      
      // Calculate zone thresholds for 2-zone/3-zone/1-zone system
      const tenPercentWidth = containerWidth * 0.1;
      const sixtyPercentWidth = containerWidth * 0.6;
      const firstZoneEnd = containerLeft + tenPercentWidth;  // 0-10%
      const secondZoneEnd = containerLeft + sixtyPercentWidth;  // 10-60%
      // Third zone: 60-100%
      
      const currentTaskLevel = task.level || 0;
      const draggedTaskIsIndented = currentTaskLevel > 0;
      
      // 🔧 FIX: Extract target task ID from DOM to determine if target has children
      const targetTaskId = targetElement.getAttribute('data-sortable-id');
      const targetTaskHasChildren = targetTaskId ? allTasks.some(t => t.parent_id === targetTaskId) : false;
      
      // Debug logging for threshold detection
      console.log('🎯 Zone Detection Debug:', {
        mouseX: x,
        containerLeft,
        containerWidth,
        targetLevel,
        currentTaskLevel,
        draggedTaskIsIndented,
        targetTaskId,
        targetTaskHasChildren,
        firstZoneEnd,
        secondZoneEnd,
        'zone1(0-10%)': x < firstZoneEnd,
        'zone2(10-60%)': x >= firstZoneEnd && x < secondZoneEnd,
        'zone3(60-100%)': x >= secondZoneEnd
      });
      
      let dragType: 'indent' | 'outdent' | 'reorder' = 'reorder';
      
      // Calculate target indent level for progressive visual feedback
      let targetIndentLevel = targetLevel + 1; // Where we would indent to
      
      // Check if dragged task is being dragged over its parent (outdent scenario)
      const draggedTaskIsOverItsParent = targetTaskId === task.parent_id;
      
      console.log('🔧 Simplified zone detection:', {
        draggedTask: task.text,
        targetTaskId,
        isOverParent: draggedTaskIsOverItsParent,
        zone: x < firstZoneEnd ? 'RED (0-10%)' : 'GREEN (10-100%)',
        targetIndentLevel
      });
      
      if (draggedTaskIsOverItsParent) {
        // Child task being dragged over its parent
        if (x < firstZoneEnd) {
          // 0-10% zone: outdent to sibling level
          dragType = 'outdent';
          console.log('🟥 Child-to-parent RED ZONE: outdent');
        } else {
          // 10-100% zone: maintain parent-child relationship
          dragType = 'indent';
          console.log('🟩 Child-to-parent GREEN ZONE: indent');
        }
      } else if (targetTaskHasChildren) {
        // Target task has children - always indent across whole zone
        dragType = 'indent';
        console.log('✅ Parent with children: indent across whole zone');
      } else if (targetLevel === 3) {
        // Max level - only reorder allowed
        dragType = 'reorder';
        console.log('✅ Max level: reorder only');
      } else {
        // Standard 2-zone system
        if (x < firstZoneEnd) {
          // 0-10% zone
          dragType = draggedTaskIsIndented ? 'outdent' : 'reorder';
          console.log(`✅ Standard RED zone: ${dragType}`);
        } else {
          // 10-100% zone
          dragType = 'indent';
          console.log('✅ Standard GREEN zone: indent');
        }
      }
      
      // Dev-Guide: Final result logging (essential for debugging)
      console.log('🎯 Final dragType:', dragType, 'for', task.text);
      
      setIndentationState({
        dragType,
        cursorPosition: { x, y },
        targetTaskLeftEdge: containerLeft,
        containerWidth,
        targetIndentLevel: Math.min(targetIndentLevel, 4) // Cap at 4 levels for visual feedback
      });
      
    } catch (error) {
      console.error('Error updating cursor position:', error);
      // Fallback to reorder mode
      setIndentationState({
        dragType: 'reorder',
        cursorPosition: { x, y },
        targetTaskLeftEdge: null,
        targetIndentLevel: undefined
      });
    }
  }, [isSection, task.level, task.text, allTasks]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: task.id,
    data: {
      type: isSection ? 'section' : 'task',
      task,
      index,
      indentationState, // Include indentation state in drag data
      updateCursorPosition // Include cursor position function in drag data
    },
    disabled: isSection // Sections cannot be dragged for now
  })

  // 🔧 FIX: Prevent task shuffling - only apply transforms to actively dragged items
  // This ensures other tasks remain in their original positions during drag operations
  // Only the task being dragged gets position transforms, while drop targets show visual feedback
  const optimizedTransform = (transform && isDragging) ? 
    `translate3d(${transform.x}px, ${transform.y}px, 0)` : 
    undefined

  /**
   * Get CSS classes for the row based on drag state
   * 🔧 FIX: Prevent visual shuffling - only dragged items get transform styles
   */
  const getRowClassName = useCallback((): string => {
    try {
      const baseClasses = 'relative flex items-center'
      
      if (isDragging) {
        // Only the actively dragged item gets transform styling
        return `${baseClasses} opacity-50 rotate-1 scale-105 z-50` // Higher z-index for proper layering
      }
      
      if (isOver) {
        // Drop targets only get subtle background tint, no position changes  
        return `${baseClasses} transition-all duration-200 bg-purple-50 border-purple-200`
      }
      
      // All other tasks remain completely static with normal transitions
      return `${baseClasses} transition-all duration-200`
    } catch (error) {
      console.error('Error getting row className:', error)
      return 'relative flex items-center transition-all duration-200' // Fallback
    }
  }, [isDragging, isOver])

  /**
   * Get CSS classes for the grip icon based on drag state
   * Shows interactive state when hovering/dragging
   */
  const getGripClassName = useCallback((): string => {
    try {
      const baseClasses = 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2'
      
      if (isDragging) {
        return `${baseClasses} opacity-100 cursor-grabbing text-purple-600`
      }
      
      return `${baseClasses} cursor-grab hover:text-purple-600`
    } catch (error) {
      console.error('Error getting grip className:', error)
      return 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2' // Fallback
    }
  }, [isDragging])


  // Reset indentation state when drag ends
  useEffect(() => {
    if (!isDragging && !isOver) {
      setIndentationState({
        dragType: 'reorder',
        cursorPosition: null,
        targetTaskLeftEdge: null,
        targetIndentLevel: undefined
      });
    }
  }, [isDragging, isOver]);

  return {
    // @dnd-kit props to spread on the draggable element
    attributes: {
      ...attributes,
      // 🔧 FIX: Add touch-action for better pointer handling
      'data-touch-action': 'none' // Will be handled via CSS
    },
    listeners,
    setNodeRef,
    transform: optimizedTransform, // Use optimized transform with translate3d
    
    // Drag state
    isDragging,
    isOver,
    
    // Enhanced indentation state
    indentationState,
    
    // Helper functions
    getRowClassName,
    getGripClassName,
    
    // Cursor tracking for indentation
    updateCursorPosition
  }
} 