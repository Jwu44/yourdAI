import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import MicrostepSuggestions from '@/components/parts/MicrostepSuggestions';
import { TypographyH4 } from '../../app/fonts/text';
import { MoreHorizontal, Sparkles, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useForm } from '../../lib/FormContext';
import { useToast } from "@/hooks/use-toast";
import TaskEditDrawer from './TaskEditDrawer';
import { 
  Task
} from '../../lib/types';
import { 
  handleMicrostepDecomposition
} from '../../lib/helper';
import { isBrowser } from '../../lib/utils';

interface EditableScheduleRowProps {
  task: Task;
  index: number;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void;
  isSection: boolean;
  children?: React.ReactNode;
  allTasks: Task[]; 
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
  isSection
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

  // New state for microsteps
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [suggestedMicrosteps, setSuggestedMicrosteps] = useState<Task[]>([]);
  const [showMicrosteps, setShowMicrosteps] = useState(false);

  // Hooks
  const { state: formData } = useForm();
  const { toast } = useToast();

  // Can only decompose non-section, non-microstep, non-subtask tasks
  const canDecompose = !isSection && !task.is_microstep && !task.is_subtask;

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

      const newDragState: DragState = {
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

  /**
   * Handles task decomposition into microsteps
   * 
   * Uses the AI service to break down a task into smaller, more manageable steps
   * and presents them to the user for selection.
   */
  const handleDecompose = useCallback(async () => {
    // Guard clause - only proceed if decomposition is allowed and not already in progress
    if (!canDecompose || isDecomposing) return;

    try {
      // Set loading state and clear any existing microsteps
      setIsDecomposing(true);
      setShowMicrosteps(false);
      
      // Get microstep texts from backend
      const microstepTexts = await handleMicrostepDecomposition(task, formData);
      
      // Convert microstep texts into full Task objects
      // Updated to handle both string array and object array responses
      const microstepTasks = microstepTexts.map((step: string | { 
        text: string; 
        rationale?: string;
        estimated_time?: string;
        energy_level_required?: 'low' | 'medium' | 'high';
      }) => {
        // Handle both string and object formats
        const isObject = typeof step !== 'string';
        const text = isObject ? step.text : step;
        const rationale = isObject ? step.rationale : undefined;
        const estimatedTime = isObject ? step.estimated_time : undefined;
        const energyLevel = isObject ? step.energy_level_required : undefined;
        
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
        };
      });

      // Update UI with new microsteps
      setSuggestedMicrosteps(microstepTasks);
      setShowMicrosteps(true);
      
      // Show success message
      toast({
        title: "Success",
        description: "Select which microsteps to add",
      });
      
    } catch (error) {
      // Handle and display any errors
      console.error('Error decomposing task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decompose task",
        variant: "destructive",
      });
    } finally {
      // Reset loading state regardless of outcome
      setIsDecomposing(false);
    }
  }, [canDecompose, task, formData, toast, isDecomposing]);

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
      };

      // Call the main onUpdateTask function which will handle the task creation
      onUpdateTask(newSubtask);

      // Remove the microstep from suggestions
      setSuggestedMicrosteps(prev => prev.filter(step => step.id !== microstep.id));

      // Close suggestions panel when all microsteps are handled
      if (suggestedMicrosteps.length <= 1) {
        setShowMicrosteps(false);
      }

      // Show success toast
      toast({
        title: "Success",
        description: "Microstep added to schedule",
      });

    } catch (error) {
      console.error('Error accepting microstep:', error);
      toast({
        title: "Error",
        description: "Failed to add microstep to schedule",
        variant: "destructive",
      });
    }
  }, [task, onUpdateTask, suggestedMicrosteps.length, toast]);

  // Update the handleMicrostepReject to simply remove the suggestion
  const handleMicrostepReject = useCallback((microstep: Task) => {
    // Remove the rejected microstep from suggestions
    setSuggestedMicrosteps(prev => prev.filter(step => step.id !== microstep.id));

    // Close suggestions panel when all microsteps are handled
    if (suggestedMicrosteps.length <= 1) {
      setShowMicrosteps(false);
    }
  }, [suggestedMicrosteps.length]);

  // Render task actions
  const renderTaskActions = () => (
    <div className="flex items-center space-x-2">
      {canDecompose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecompose}
          disabled={isDecomposing}
          className={cn(
            "text-primary hover:text-primary/80",
            isDecomposing && "opacity-50 cursor-not-allowed"
          )}
        >
          {isDecomposing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      )}
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
    </div>
  );

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
        className={cn(
          "relative flex items-center p-2 my-1 rounded",
          isSection ? "cursor-default flex-col items-start" : "cursor-move",
          isDecomposing && "animate-pulse",
          task.level && task.level > 0 ? "pl-8" : "",
          isSection ? "mt-4" : ""
        )}
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
          <span className={`flex-1 text-white ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.start_time && task.end_time ? 
              `${task.start_time} - ${task.end_time}: ` : ''}
            {task.text}
          </span>
        )}

        {/* Task Actions */}
        {!isSection && renderTaskActions()}

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

      {/* Edit Task Drawer */}
      {isDrawerOpen ? (
        <TaskEditDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          task={task}
          onUpdateTask={handleTaskUpdate}
          currentDate={task.start_date || new Date().toISOString().split('T')[0]} // Add current date prop
        />
      ) : null}
    </motion.div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(EditableScheduleRow);