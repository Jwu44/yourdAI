import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { Task } from '../../lib/types';
import { isBrowser } from '../../lib/utils';
import { TypographyH4 } from '../../app/fonts/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskEditDrawer from './TaskEditDrawer';

interface EditableScheduleRowProps {
  task: Task;
  index: number;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void;
  isSection: boolean;
  children?: React.ReactNode;
}

// Interface for managing drag state
interface DragState {
  isDragTarget: boolean;
  dragType: 'above' | 'below' | 'indent' | null;
  indentationLevel: number;
  cursorPastCheckbox: boolean;
}

// Add this interface for the drag indicator props
interface DragIndicatorProps {
  left: number;
  width: string | number;
  opacity: number;
}

const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({ 
  task, 
  index,
  onUpdateTask, 
  onDeleteTask,
  moveTask,
  isSection,
  children
}) => {
  // Local UI states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragTarget: false,
    dragType: null,
    indentationLevel: 0,
    cursorPastCheckbox: false
  });
  
  // Refs for DOM measurements
  const rowRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // Handlers for task operations
  const handleToggleComplete = useCallback((checked: boolean) => {
    onUpdateTask({ 
      ...task, 
      completed: checked,
      categories: task.categories || []
    });
  }, [task, onUpdateTask]);

  const handleEdit = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    onDeleteTask(task.id);
  }, [onDeleteTask, task.id]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Reset pointer-events when component unmounts
      document.body.style.pointerEvents = 'auto';
    };
  }, []);

  const handleDrawerClose = useCallback(() => {
    // Ensure pointer-events is reset when drawer closes
    document.body.style.pointerEvents = 'auto';
    setIsDrawerOpen(false);
  }, []);

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    // Ensure we maintain task structure properties
    const cleanTask = {
      ...updatedTask,
      categories: updatedTask.categories || [],
      is_subtask: task.is_subtask,
      level: task.level,
      section: task.section,
      parent_id: task.parent_id,
      type: task.type
    };
    
    onUpdateTask(cleanTask);
    setIsDrawerOpen(false);
  }, [onUpdateTask, task]);

  // Enhanced drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isBrowser() && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';
      if (rowRef.current) {
        rowRef.current.style.opacity = '0.5';
      }
    }
  }, [index]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isBrowser() || !e.dataTransfer || isSection) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    
    try {
      const rect = rowRef.current?.getBoundingClientRect();
      const checkboxRect = checkboxRef.current?.getBoundingClientRect();
      
      if (!rect || !checkboxRect) {
        return;
      }

      // Calculate cursor position relative to checkbox
      const cursorPastCheckbox = e.clientX > (checkboxRect.right);
      
      // Calculate available indentation levels based on current task level
      const maxIndentLevel = cursorPastCheckbox ? 
        Math.min((task.level || 0) + 1, 3) : 0; // Limit max indent to 3 levels
      
      // Calculate vertical position for drag type
      const mouseY = e.clientY - rect.top;
      const threshold = rect.height / 3;

      let newDragState: DragState = {
        isDragTarget: true,
        dragType: null,
        indentationLevel: maxIndentLevel,
        cursorPastCheckbox
      };

      if (mouseY < threshold) {
        newDragState.dragType = 'above';
      } else if (mouseY > rect.height - threshold) {
        newDragState.dragType = 'below';
      } else {
        newDragState.dragType = 'indent';
      }

      setDragState(newDragState);
      
    } catch (error) {
      console.error('Error in handleDragOver:', error);
      // Reset to safe state on error
      setDragState({
        isDragTarget: false,
        dragType: null,
        indentationLevel: 0,
        cursorPastCheckbox: false
      });
    }
  }, [isSection, task.level]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragState({
      isDragTarget: false,
      dragType: null,
      indentationLevel: 0,
      cursorPastCheckbox: false
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isBrowser() && e.dataTransfer) {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      
      if (isSection) {
        moveTask(dragIndex, index, false, task.text);
      } else {
        // Only indent if we're in indent mode and cursor is past checkbox
        const shouldIndent = dragState.dragType === 'indent' && dragState.cursorPastCheckbox;
        
        // If dropping below, we need to adjust the target index
        const targetIndex = dragState.dragType === 'below' ? index + 1 : index;
        
        moveTask(dragIndex, targetIndex, shouldIndent, null);
      }
    }
    
    // Reset drag state
    setDragState({
      isDragTarget: false,
      dragType: null,
      indentationLevel: 0,
      cursorPastCheckbox: false
    });
  }, [index, moveTask, dragState, isSection, task.text]);

  const handleDragEnd = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.opacity = '1';
    }
  }, []);

  // Implements blue line indicator behaviour
  const getDragIndicators = useCallback(() => {
    if (!dragState.isDragTarget) return null;

    if (!dragState.cursorPastCheckbox || dragState.dragType === 'above') {
      // Single line for regular reordering
      return (
        <div
          className="absolute right-0 left-0 h-0.5 bg-blue-500"
          style={{ 
            opacity: 0.5,
            bottom: '-1px' // Position at bottom of row
          }}
        />
      );
    }

    if (dragState.dragType === 'indent') {
      const totalLevels = dragState.indentationLevel + 1;
      const indicators: DragIndicatorProps[] = [];

      for (let i = 0; i < totalLevels; i++) {
        const isFirstLine = i === 0;
        const leftOffset = i * 20; // 20px indent per level
        const opacity = 0.3 + (i * 0.2); // Increasing opacity for each level

        indicators.push({
          left: leftOffset,
          width: isFirstLine ? 8 : `calc(100% - ${leftOffset}px)`,
          opacity
        });
      }

      return (
        <div className="absolute inset-0 pointer-events-none">
          {indicators.map((indicator, index) => (
            <React.Fragment key={index}>
              <div
                className="absolute h-0.5 bg-blue-500"
                style={{
                  left: indicator.left,
                  width: indicator.width,
                  opacity: indicator.opacity,
                  bottom: '-1px', // Position at bottom of row
                  transform: 'none' // Remove vertical centering
                }}
              />
              {index < indicators.length - 1 && (
                <div className="w-1" /> // 2px spacing between lines
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    return null;
  }, [dragState]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <div
        ref={rowRef}
        draggable={!isSection && isBrowser()}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className={`relative flex items-center p-2 my-1 bg-background rounded ${
          isSection ? 'cursor-default flex-col items-start' : 'cursor-move'
        }`}
        style={{
          marginLeft: task.is_subtask ? `${(task.level || 1) * 20}px` : 0,
          minHeight: isSection ? '40px' : 'auto',
        }}
      >
        {/* Task/Section Content */}
        {!isSection && (
          <>
            <div ref={checkboxRef} className="flex items-center">
              {task.is_subtask && (
                <div className="w-4 h-4 mr-2 border-l border-b border-muted" />
              )}
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="mr-2 border-white"
              />
            </div>
          </>
        )}

        {isSection ? (
          <>
            <TypographyH4 className="w-full mb-2">
              {task.text}
            </TypographyH4>
            <div className="w-full h-px bg-white opacity-50" />
          </>
        ) : (
          <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.start_time && task.end_time ? 
              `${task.start_time} - ${task.end_time}: ` : ''}
            {task.text}
          </span>
        )}

        {/* Task Actions */}
        {!isSection && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Enhanced Drag Indicators */}
        {getDragIndicators()}
      </div>

      {/* Edit Task Drawer */}
      {isDrawerOpen ? (
        <TaskEditDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          task={task}
          onUpdateTask={handleTaskUpdate}
        />
      ) : null}
    </motion.div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(EditableScheduleRow);