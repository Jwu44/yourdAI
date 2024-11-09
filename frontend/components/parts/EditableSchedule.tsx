import React, { useMemo, useCallback } from 'react';
import { Pane } from 'evergreen-ui';
import { TypographyH4 } from '@/app/fonts/text';
import EditableScheduleRow from './EditableScheduleRow';
import { Task } from '../../lib/types';

interface EditableScheduleProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (tasks: Task[]) => void;
  layoutPreference: string;
}

const EditableSchedule: React.FC<EditableScheduleProps> = ({ 
  tasks, 
  onUpdateTask, 
  onDeleteTask, 
  onReorderTasks, 
  layoutPreference
}) => {
  const memoizedTasks = useMemo(() => {
    if (layoutPreference === 'category') {
      const groupedTasks = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
        const category = task.categories?.[0] || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({...task}); // Create new reference
        return acc;
      }, {});

      return Object.entries(groupedTasks)
        .filter(([category]) => category !== 'Uncategorized')
        .flatMap(([category, categoryTasks]) => [
          {
            id: `section-${category}`,
            text: category.charAt(0).toUpperCase() + category.slice(1),
            is_section: true,
            type: 'section',
            categories: [],
            completed: false
          } as Task,
          ...categoryTasks.map(task => ({
            ...task,
            type: 'task',
            section: category
          }))
        ]);
    } else {
      let currentSection: string | null = null;
      let sectionStartIndex = 0;
      return tasks.map((task, index) => {
        if (task.is_section) {
          currentSection = task.text;
          sectionStartIndex = index;
          return {
            ...task,
            type: 'section',
            section: currentSection,
            sectionIndex: 0
          };
        }
        return {
          ...task,
          type: 'task',
          section: currentSection,
          sectionIndex: index - sectionStartIndex
        };
      });
    }
  }, [tasks, layoutPreference]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    const taskIndex = memoizedTasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
      // Create a new array with the updated task
      const newTasks = memoizedTasks.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      );
      
      // Call onUpdateTask before updating the local state
      onUpdateTask(updatedTask);
      onReorderTasks(newTasks);
    }
  }, [memoizedTasks, onUpdateTask, onReorderTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const newTasks = memoizedTasks.filter(task => 
      task.id !== taskId && task.parent_id !== taskId
    );
    onDeleteTask(taskId);
    onReorderTasks(newTasks);
  }, [memoizedTasks, onDeleteTask, onReorderTasks]);

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
      const targetTask = newTasks[hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex];
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
        newTasks.splice(hoverIndex, 0, updatedDraggedTask);
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
      {memoizedTasks.map((item, index) => (
        <React.Fragment key={`${item.id}-${item.type}`}>
          <EditableScheduleRow
            task={item}
            index={index}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            moveTask={moveTask}
            isSection={item.type === 'section'}
          >
            {item.type === 'section' && (
              <TypographyH4 className="mt-3 mb-1">
                {item.text}
              </TypographyH4>
            )}
          </EditableScheduleRow>
        </React.Fragment>
      ))}
    </Pane>
  );
};

export default React.memo(EditableSchedule);