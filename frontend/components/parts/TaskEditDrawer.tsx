import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { 
  Task, 
  RecurrenceType, 
  WeekDay, 
  MonthWeek,
  RECURRENCE_OPTIONS 
} from '../../lib/types';

interface TaskEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  onUpdateTask?: (task: Task) => void;
  onCreateTask?: (task: Task) => void;
  currentDate: string;
}

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work'];

const TaskEditDrawer: React.FC<TaskEditDrawerProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onCreateTask,
  currentDate,
}) => {
  // Determine if we're in create mode (no task provided)
  const isCreateMode = !task;

  // Initialize empty task state with all required fields
  const getEmptyTask = (): Task => ({
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
    start_date: currentDate,
    energy_level_required: 'medium'
  });

  // Initialize state with either empty task or existing task
  const [editedTask, setEditedTask] = useState<Task>(() => {
    if (isCreateMode) {
      return getEmptyTask();
    }
    return { ...task } as Task;
  });

  // Cleanup ref for pointer events
  const needsCleanup = useRef(false);

  // Effect for pointer events cleanup
  useEffect(() => {
    const originalPointerEvents = document.body.style.pointerEvents;
    
    if (isOpen) {
      needsCleanup.current = true;
    }

    return () => {
      if (needsCleanup.current) {
        document.body.style.pointerEvents = originalPointerEvents || 'auto';
        needsCleanup.current = false;
      }
    };
  }, [isOpen]);

  // Reset form when drawer is opened/closed
  useEffect(() => {
    if (isOpen && isCreateMode) {
      setEditedTask(getEmptyTask());
    }
  }, [isOpen, isCreateMode, currentDate]);

  // Get current day of week from task's date or today
  const getCurrentDayOfWeek = useCallback((): WeekDay => {
    try {
      const date = task?.start_date ? parseISO(task.start_date) : new Date();
      return format(date, 'EEEE') as WeekDay;
    } catch (error) {
      console.error('Error getting day of week:', error);
      return format(new Date(), 'EEEE') as WeekDay;
    }
  }, [task?.start_date]);

  // Get week of month (first, second, third, fourth, last)
  const getWeekOfMonth = useCallback((): MonthWeek => {
    try {
      const date = task?.start_date ? parseISO(task.start_date) : new Date();
      const dayOfMonth = date.getDate();
      
      if (dayOfMonth >= 1 && dayOfMonth <= 7) return 'first';
      if (dayOfMonth >= 8 && dayOfMonth <= 14) return 'second';
      if (dayOfMonth >= 15 && dayOfMonth <= 21) return 'third';
      if (dayOfMonth >= 22 && dayOfMonth <= 28) return 'fourth';
      return 'last';
    } catch (error) {
      console.error('Error getting week of month:', error);
      return 'first';
    }
  }, [task?.start_date]);

  // Format recurrence label with current day/week
  const getRecurrenceLabel = useCallback((option: typeof RECURRENCE_OPTIONS[0]): string => {
    try {
      if (option.value === 'weekly') {
        return option.label.replace('{day}', getCurrentDayOfWeek());
      }
      if (option.value === 'monthly') {
        return option.label
          .replace('{week}', getWeekOfMonth())
          .replace('{day}', getCurrentDayOfWeek());
      }
      return option.label;
    } catch (error) {
      console.error('Error formatting recurrence label:', error);
      return option.label;
    }
  }, [getCurrentDayOfWeek, getWeekOfMonth]);

  // Handle input changes for text fields
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedTask(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback((category: string) => {
    setEditedTask(prev => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...(prev.categories || []), category]
    }));
  }, []);

  // Handle recurrence selection
  const handleRecurrenceChange = useCallback((value: string) => {
    try {
      if (value === 'none') {
        setEditedTask(prev => ({
          ...prev,
          is_recurring: null
        }));
        return;
      }

      const recurrence: RecurrenceType = {
        frequency: value as RecurrenceType['frequency'],
        dayOfWeek: getCurrentDayOfWeek(),
        weekOfMonth: value === 'monthly' ? getWeekOfMonth() : undefined
      };

      setEditedTask(prev => ({
        ...prev,
        is_recurring: recurrence
      }));
    } catch (error) {
      console.error('Error setting recurrence:', error);
      setEditedTask(prev => ({
        ...prev,
        is_recurring: null
      }));
    }
  }, [getCurrentDayOfWeek, getWeekOfMonth]);

  // Get category color
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Work': return 'bg-blue-500';
      case 'Fun': return 'bg-yellow-500';
      case 'Relationships': return 'bg-purple-500';
      case 'Ambition': return 'bg-orange-500';
      case 'Exercise': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Handle save with form reset
  const handleSave = useCallback(() => {
    try {
      if (!editedTask.text.trim()) {
        return;
      }

      if (isCreateMode && onCreateTask) {
        onCreateTask({
          ...editedTask,
          id: '',
        });
      } else if (onUpdateTask) {
        onUpdateTask(editedTask);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setEditedTask(getEmptyTask());
      onClose();
    }
  }, [editedTask, isCreateMode, onCreateTask, onUpdateTask, onClose]);

  // Handle close with form reset
  const handleClose = useCallback(() => {
    if (needsCleanup.current) {
      document.body.style.pointerEvents = 'auto';
      needsCleanup.current = false;
    }
    setEditedTask(getEmptyTask());
    onClose();
  }, [onClose]);

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      modal={true}
    >
      <DrawerContent
        className="fixed bottom-0 left-0 right-0 h-[75vh] w-full bg-[#000000] shadow-lg outline-none"
        onPointerDownOutside={(e) => {
          e.preventDefault();
          handleClose();
        }}
      >
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Edit Task</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {/* Task Name */}
            <div>
              <label htmlFor="text" className="block text-sm font-medium">
                Task Name
              </label>
              <Input
                id="text"
                name="text"
                value={editedTask.text}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    className={`cursor-pointer ${
                      editedTask.categories?.includes(category)
                        ? getCategoryColor(category)
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                    {editedTask.categories?.includes(category) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Time Fields */}
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium">
                Start Time
              </label>
              <Input
                id="start_time"
                name="start_time"
                value={editedTask.start_time || ''}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium">
                End Time
              </label>
              <Input
                id="end_time"
                name="end_time"
                value={editedTask.end_time || ''}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>

            {/* Recurrence Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
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
                <SelectContent className="select-content">
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

          {/* Footer */}
          <DrawerFooter>
            <Button onClick={handleSave}>Save</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TaskEditDrawer;