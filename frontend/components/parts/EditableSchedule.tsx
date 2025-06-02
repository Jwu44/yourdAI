import React, { useMemo, useCallback } from 'react';
import { Pane } from 'evergreen-ui';
import { TypographyH4 } from '@/app/fonts/text';
import EditableScheduleRow from './EditableScheduleRow';
import AISuggestionsList from './AISuggestionsList';
import { 
  Task, 
  AISuggestion, 
  ScheduleLayoutType, 
  BaseLayoutType, 
  LayoutStructure 
} from '../../lib/types';
import { applyScheduleLayout } from '../../lib/ScheduleHelper';

/**
 * Props interface for the EditableSchedule component
 */
interface EditableScheduleProps {
  /** Tasks to display in the schedule */
  tasks: Task[];
  
  /** Callback function for updating a task */
  onUpdateTask: (task: Task) => void;
  
  /** Callback function for deleting a task */
  onDeleteTask: (taskId: string) => void;
  
  /** Callback function for reordering tasks */
  onReorderTasks: (tasks: Task[]) => void;
  
  /** 
   * Layout preference for the schedule
   * Can be:
   * - ScheduleLayoutType string (e.g., 'todolist-structured')
   * - Legacy string ('structured', 'unstructured', 'category')
   */
  layoutPreference: string | ScheduleLayoutType;
  
  /** Callback function to request AI suggestions */
  onRequestSuggestions: () => Promise<void>;
  
  /** Flag indicating if suggestions are being loaded */
  isLoadingSuggestions: boolean;
  
  /** Map of task IDs to associated AI suggestions */
  suggestionsMap: Map<string, AISuggestion[]>;
  
  /** Callback function for accepting a suggestion */
  onAcceptSuggestion: (suggestion: AISuggestion) => void;
  
  /** Callback function for rejecting a suggestion */
  onRejectSuggestion: (suggestionId: string) => void;
}

const EditableSchedule: React.FC<EditableScheduleProps> = ({ 
  tasks, 
  onUpdateTask, 
  onDeleteTask, 
  onReorderTasks, 
  layoutPreference,
  suggestionsMap,
  onAcceptSuggestion,
  onRejectSuggestion
}) => {
  /**
   * Convert and validate layout preference to ensure it's a proper ScheduleLayoutType
   * 
   * Handles legacy string preferences and normalizes to the correct format
   * while ensuring the result is a valid ScheduleLayoutType.
   */
  const normalizedLayoutType: ScheduleLayoutType = useMemo(() => {
    // Handle legacy string preferences
    if (layoutPreference === 'category' || layoutPreference === 'structured') {
      return 'todolist-structured';
    } else if (layoutPreference === 'unstructured') {
      return 'todolist-unstructured';
    }
    
    // If it's already a ScheduleLayoutType string, validate it
    const layoutString = String(layoutPreference);
    if (layoutString.includes('-')) {
      const [baseType, structure] = layoutString.split('-') as [BaseLayoutType, LayoutStructure];
      
      // Validate base type
      const validBaseTypes: BaseLayoutType[] = ['todolist', 'kanban', 'calendar', 'timeline'];
      const validStructures: LayoutStructure[] = ['structured', 'unstructured'];
      
      if (validBaseTypes.includes(baseType) && validStructures.includes(structure)) {
        return layoutString as ScheduleLayoutType;
      }
    }
    
    // Default fallback for invalid formats
    return 'todolist-structured';
  }, [layoutPreference]);

  // Use the scheduleHelper function to apply the layout
  const memoizedTasks = useMemo(() => {
    return applyScheduleLayout(tasks, normalizedLayoutType);
  }, [tasks, normalizedLayoutType]);

  // Enhanced moveTask to handle indentation levels more precisely
  const moveTask = useCallback((dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => {
    const draggedTask = {...memoizedTasks[dragIndex]}; // Create new reference
    const newTasks = memoizedTasks.filter((_, index) => index !== dragIndex);

    if (targetSection) {
      const sectionIndex = newTasks.findIndex(task => 
        task.is_section && task.text === targetSection
      );
      
      if (sectionIndex !== -1) {
        // When moving to a section, reset indentation
        newTasks.splice(sectionIndex + 1, 0, { 
          ...draggedTask, 
          section: targetSection, 
          is_subtask: false, 
          level: 0, 
          parent_id: null,
          categories: [targetSection]
        });
      } else {
        newTasks.push({ 
          ...draggedTask, 
          section: targetSection, 
          is_subtask: false, 
          level: 0, 
          parent_id: null,
          categories: [targetSection]
        });
      }
    } else {
      // Get the actual target task based on the hover index
      const targetTask = memoizedTasks[hoverIndex];
      const updatedDraggedTask = { ...draggedTask };
      
      if (shouldIndent && !targetTask.is_section) {
        // Calculate the new indentation level based on the target task
        const newLevel = Math.min((targetTask.level || 0) + 1, 3); // Limit to 3 levels
        
        // Update the dragged task properties
        updatedDraggedTask.is_subtask = true;
        updatedDraggedTask.level = newLevel;
        updatedDraggedTask.parent_id = targetTask.id; // Set parent to the target task
        updatedDraggedTask.section = targetTask.section;
        
        // Insert the task immediately after its new parent
        // FIX: Adjust the insertion index to account for the removed dragged task
        const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex;
        newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask);
      } else {
        // Handle non-indentation moves
        if (targetTask.is_section) {
          // When dropping onto a section header, place after it
          newTasks.splice(hoverIndex + 1, 0, {
            ...updatedDraggedTask,
            is_subtask: false,
            level: 0,
            parent_id: null,
            section: targetTask.text,
            categories: [targetTask.text]
          });
        } else {
          // Maintain the task's current indentation level if it's being moved
          // within the same parent or to the same level
          const keepIndentation = 
            targetTask.parent_id === draggedTask.parent_id ||
            targetTask.level === draggedTask.level;

          newTasks.splice(hoverIndex, 0, {
            ...updatedDraggedTask,
            is_subtask: keepIndentation ? draggedTask.is_subtask : false,
            level: keepIndentation ? draggedTask.level : 0,
            parent_id: keepIndentation ? draggedTask.parent_id : null
          });
        }
      }
    }

    // Update parent_id for all affected subtasks
    const updateSubtaskParents = (tasks: Task[]): Task[] => {
      const taskMap = new Map<string, Task>();
      tasks.forEach(task => taskMap.set(task.id, task));

      return tasks.map(task => {
        if (task.is_subtask && task.parent_id) {
          const parent = taskMap.get(task.parent_id);
          if (!parent || parent.level! >= task.level!) {
            return { ...task, is_subtask: false, level: 0, parent_id: null };
          }
        }
        return task;
      });
    };

    const finalTasks = updateSubtaskParents(newTasks);
    onReorderTasks(finalTasks);
  }, [memoizedTasks, onReorderTasks]); // Added dependency array


  return (
    <Pane>
      {/* Tasks and Suggestions */}
      {memoizedTasks.map((task, index) => (
        <React.Fragment key={`${task.id}-${task.type}`}>
          <EditableScheduleRow
            task={task}
            index={index}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            moveTask={moveTask}
            isSection={task.type === 'section'}
            allTasks={memoizedTasks}
          >
            {task.type === 'section' && (
              <TypographyH4 className="mt-3 mb-1">
                {task.text}
              </TypographyH4>
            )}
          </EditableScheduleRow>

          {/* Render suggestions after each task if they exist */}
          {suggestionsMap.has(task.id) && (
            <div className="ml-6 my-2">
              <AISuggestionsList
                suggestions={suggestionsMap.get(task.id) || []}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
                className="border-l-2 border-blue-500 pl-4"
              />
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Render suggestions for schedule start if they exist */}
      {suggestionsMap.has('schedule-start') && (
        <div className="mb-4">
          <AISuggestionsList
            suggestions={suggestionsMap.get('schedule-start') || []}
            onAccept={onAcceptSuggestion}
            onReject={onRejectSuggestion}
            className="border-l-2 border-blue-500 pl-4"
          />
        </div>
      )}
    </Pane>
  );
};

export default React.memo(EditableSchedule);