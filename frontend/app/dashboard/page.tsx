'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// UI Components
import { Button } from '@/components/ui/button';
import { Loader2, ActivitySquare, Heart, Smile, Trophy  } from 'lucide-react';
import FloatingActionButton from '@/components/parts/FloatingActionButton';
import TaskEditDrawer from '@/components/parts/TaskEditDrawer';

// Custom Components
import DashboardHeader from '@/components/parts/DashboardHeader';
import EditableSchedule from '@/components/parts/EditableSchedule';

// Hooks and Context
import { useToast } from "@/hooks/use-toast";
import { useForm } from '../../lib/FormContext';

// Types
import { 
  Task, 
  Priority, 
  LayoutPreference,
  AISuggestion, 
  GetAISuggestionsResponse 
} from '../../lib/types';

// Helpers
import {
  handleAddTask,
  handleUpdateTask,
  handleDeleteTask,
  parseScheduleToTasks,
  generateNextDaySchedule,
  submitFormData,
  extractSchedule,
  handleEnergyChange,
  loadScheduleForDate,
  updateScheduleForDate, 
  fetchAISuggestions,
  formatDateToString
} from '@/lib/helper';


const initialPriorities: Priority[] = [
    { id: 'health', name: 'Health', icon: ActivitySquare, color: 'green' },
    { id: 'relationships', name: 'Relationships', icon: Heart, color: 'red' },
    { id: 'fun_activities', name: 'Fun Activities', icon: Smile, color: 'blue' },
    { id: 'ambitions', name: 'Ambitions', icon: Trophy, color: 'yellow' }
  ];

const Dashboard: React.FC = () => {
  const [newTask, setNewTask] = useState('');
  const [scheduleDays, setScheduleDays] = useState<Task[][]>([]);
  const [priorities, setPriorities] = useState<Priority[]>(initialPriorities);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { state, dispatch } = useForm();
  const { toast } = useToast();
  const [shouldUpdateSchedule, setShouldUpdateSchedule] = useState(false);
  const [isInitialSchedule, setIsInitialSchedule] = useState(true);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isCalendarDrawerOpen, setIsCalendarDrawerOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleCache, setScheduleCache] = useState<Map<string, Task[]>>(new Map());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Add these state variables after other state declarations
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [shownSuggestionIds] = useState<Set<string>>(new Set()); // Resets on page refresh
  const [suggestionsMap, setSuggestionsMap] = useState<Map<string, AISuggestion[]>>(new Map());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());  // Initialize with today's date
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + currentDayIndex);
    console.log('Setting currentDate:', date);
    setCurrentDate(date);
  }, [currentDayIndex]);

  const addTask = useCallback(async (taskData?: Partial<Task>) => {
    try {
      // If taskData is provided (from TaskEditDrawer), use its text
      // Otherwise use newTask state (from DashboardLeftCol)
      const taskText = taskData?.text || newTask.trim();
      
      if (!taskText) return;
  
      const updatedTasks = await handleAddTask(
        state.tasks || [], 
        taskText,
        taskData?.categories || []
      );
  
      // Get the newly created task
      const newTaskObj = updatedTasks[updatedTasks.length - 1];
  
      // If taskData exists (from TaskEditDrawer), merge additional fields
      const finalTask = taskData ? {
        ...newTaskObj,
        start_time: taskData.start_time,
        end_time: taskData.end_time,
        is_recurring: taskData.is_recurring,
        start_date: getDateString(currentDayIndex), // Use currently viewed date
      } : newTaskObj;
  
      // Update tasks state
      dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
  
      // If task is created from TaskEditDrawer, add it to current schedule
      if (taskData) {
        setScheduleDays(prevDays => {
          const newDays = [...prevDays];
          if (newDays[currentDayIndex]) {
            newDays[currentDayIndex] = [finalTask, ...newDays[currentDayIndex]];
          }
          return newDays;
        });
  
        // Update schedule cache
        const currentDate = getDateString(currentDayIndex);
        setScheduleCache(prevCache => {
          const newCache = new Map(prevCache);
          const currentTasks = prevCache.get(currentDate) || [];
          newCache.set(currentDate, [finalTask, ...currentTasks]);
          return newCache;
        });
  
        // Sync with backend
        await updateScheduleForDate(
          getDateString(currentDayIndex),
          scheduleDays[currentDayIndex]
        );
      }
  
      // Clear input if it's from DashboardLeftCol
      if (!taskData) {
        setNewTask('');
      }
  
      toast({
        title: "Success",
        description: "Task added successfully.",
      });
  
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    newTask, 
    state.tasks, 
    dispatch, 
    toast, 
    currentDayIndex, 
    scheduleDays, 
    setScheduleDays
  ]);

  const updateTask = useCallback((updatedTask: Task) => {
    const updatedTasks = handleUpdateTask(state.tasks || [], updatedTask);
    dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
    toast({
      title: "Success",
      description: "Task updated successfully.",
    });
  }, [state.tasks, dispatch, toast]);

  const deleteTask = useCallback((taskId: string) => {
    const updatedTasks = handleDeleteTask(state.tasks || [], taskId);
    dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
    toast({
      title: "Success",
      description: "Task deleted successfully.",
    });
  }, [state.tasks, dispatch, toast]);

  const handleReorder = useCallback((newPriorities: Priority[]) => {
    setPriorities(newPriorities);
    const updatedPriorities = {
      health: '',
      relationships: '',
      fun_activities: '',
      ambitions: ''
    };
    newPriorities.forEach((priority, index) => {
      updatedPriorities[priority.id as keyof typeof updatedPriorities] = (index + 1).toString();
    });
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'priorities', 
      value: updatedPriorities 
    });
  }, [dispatch]);

  // Modify the handleSubmit function
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await submitFormData(state);
      let scheduleContent = extractSchedule(result);
      console.log("Extracted schedule content:", scheduleContent);

      if (!scheduleContent) {
        toast({
          title: "Error",
          description: "No valid schedule found in the response",
          variant: "destructive",
        });
        return;
      }
      // Store the scheduleId from the result
      setScheduleId(result.scheduleId);

      dispatch({ type: 'UPDATE_FIELD', field: 'response', value: scheduleContent });
      setShouldUpdateSchedule(true);
      setIsInitialSchedule(true); // Set this to true to ensure the schedule is generated

      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [state, dispatch, toast]);

  useEffect(() => {
    const updateSchedule = async () => {
      // Only proceed if we have a response and scheduleId, and either it's initial or should update
      if (
        state.response && 
        state.scheduleId && 
        (isInitialSchedule || shouldUpdateSchedule) && 
        !isLoading
      ) {
        // Add this check to prevent duplicate processing
        if (!isInitialSchedule && !shouldUpdateSchedule) {
          return;
        }
  
        setIsLoading(true);
        
        try {
          const layoutPreference: LayoutPreference = {
            timeboxed: state.layout_preference?.timeboxed === 'timeboxed' ? 'timeboxed' : 'untimeboxed',
            subcategory: state.layout_preference?.subcategory || '',
            structure: state.layout_preference?.structure === "structured" ? "structured" : 'unstructured'
          };
  
          const parsedTasks = await parseScheduleToTasks(
            state.response, 
            state.tasks || [], 
            layoutPreference,
            state.scheduleId
          );
          
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            setScheduleDays([parsedTasks]);
            setCurrentDayIndex(0);
            // Set both flags to false after successful processing
            setShouldUpdateSchedule(false);
            setIsInitialSchedule(false);
          }
  
        } catch (error) {
          console.error("Error updating schedule:", error);
          toast({
            title: "Error",
            description: "Failed to update schedule",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
  
    updateSchedule();
  }, [
    state.response,
    state.scheduleId,
    isInitialSchedule,
    shouldUpdateSchedule,
    isLoading
  ]);
  

  // Helper function to get date string for a specific day offset
  const getDateString = (offset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  };

  const handleScheduleTaskUpdate = useCallback(async (updatedTask: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex);
      
      // Update local state
      setScheduleDays(prevDays => {
        const newDays = [...prevDays];
        if (newDays[currentDayIndex]) {
          const currentTasks = newDays[currentDayIndex];
          const taskIndex = currentTasks.findIndex(t => t.id === updatedTask.id);
          
          if (taskIndex !== -1) {
            // Update existing task
            newDays[currentDayIndex] = currentTasks.map(task => 
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task
            );
          } else {
            // Handle new subtask
            const parentIndex = currentTasks.findIndex(t => t.id === updatedTask.parent_id);
            if (parentIndex !== -1) {
              // Insert after parent and existing siblings
              const insertIndex = parentIndex + 1 + currentTasks
                .slice(0, parentIndex + 1)
                .filter(t => t.parent_id === updatedTask.parent_id).length;
              
              const newTasks = [...currentTasks];
              newTasks.splice(insertIndex, 0, updatedTask);
              newDays[currentDayIndex] = newTasks;
            }
          }
        }
        return newDays;
      });
  
      // Update cache with the same logic
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache);
        const currentTasks = prevCache.get(currentDate) || [];
        const taskIndex = currentTasks.findIndex(t => t.id === updatedTask.id);
        
        if (taskIndex !== -1) {
          // Update existing task
          const updatedTasks = currentTasks.map(task =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          );
          newCache.set(currentDate, updatedTasks);
        } else {
          // Handle new subtask
          const parentIndex = currentTasks.findIndex(t => t.id === updatedTask.parent_id);
          if (parentIndex !== -1) {
            const insertIndex = parentIndex + 1 + currentTasks
              .slice(0, parentIndex + 1)
              .filter(t => t.parent_id === updatedTask.parent_id).length;
            
            const newTasks = [...currentTasks];
            newTasks.splice(insertIndex, 0, updatedTask);
            newCache.set(currentDate, newTasks);
          }
        }
        return newCache;
      });
  
      // Persist changes to database
      const updateResult = await updateScheduleForDate(
        currentDate, 
        scheduleDays[currentDayIndex]
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update schedule');
      }
  
      // Show success toast for new subtasks
      if (!scheduleDays[currentDayIndex].find(t => t.id === updatedTask.id)) {
        toast({
          title: "Success",
          description: "Microstep added to schedule",
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDayIndex, scheduleDays, toast]);

  const handleScheduleTaskDelete = useCallback((taskId: string) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      if (newDays[currentDayIndex]) {
        newDays[currentDayIndex] = newDays[currentDayIndex].filter(task => task.id !== taskId);
      }
      return newDays;
    });
  }, [currentDayIndex]);
  
  const handleReorderTasks = useCallback((reorderedTasks: Task[]) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      newDays[currentDayIndex] = reorderedTasks;
      return newDays;
    });
  }, [currentDayIndex]);

  const handleNextDay = useCallback(async () => {
    const nextDayDate = getDateString(currentDayIndex + 1);
    console.log('Next day date:', nextDayDate);
    
    // First check if we have this day's schedule in cache
    if (scheduleCache.has(nextDayDate)) {
      setScheduleDays(prevDays => [...prevDays, scheduleCache.get(nextDayDate)!]);
      setCurrentDayIndex(prevIndex => prevIndex + 1);
      return;
    }

    try {
      // Try to load existing schedule
      const existingSchedule = await loadScheduleForDate(nextDayDate);
      
      if (existingSchedule.success && existingSchedule.schedule) {
        // Use existing schedule
        const nextDaySchedule = existingSchedule.schedule;
        setScheduleDays(prevDays => [...prevDays, nextDaySchedule]);
        setScheduleCache(prevCache => new Map(prevCache).set(nextDayDate, nextDaySchedule));
      } else {
        // Generate new schedule if none exists
        const currentSchedule = scheduleDays[currentDayIndex];
        const result = await generateNextDaySchedule(
          currentSchedule,
          state,
          scheduleDays.slice(0, currentDayIndex + 1)
        );
        
        if (result.success && result.schedule) {
          setScheduleDays(prevDays => [...prevDays, result.schedule!]);
          setScheduleCache(prevCache => new Map(prevCache).set(nextDayDate, result.schedule!));
          
          // Update both currentDayIndex and date
          setCurrentDayIndex(prevIndex => prevIndex + 1);
          // Convert nextDayDate string to Date object
          setDate(new Date(nextDayDate));
        } else {
          throw new Error(result.error || 'Failed to generate schedule');
        }
      }
      
      setCurrentDayIndex(prevIndex => {
        console.log('Setting new currentDayIndex:', prevIndex + 1);
        return prevIndex + 1;
      });
      toast({
        title: "Success",
        description: "Next day's schedule loaded successfully.",
      });
    } catch (error) {
      console.error("Error handling next day:", error);
      toast({
        title: "Error",
        description: "Failed to load next day's schedule. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDayIndex, scheduleDays, state, toast]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      // Get previous day's date
      const prevDate = new Date(date!);
      prevDate.setDate(prevDate.getDate() - 1);
      
      setCurrentDayIndex(prevIndex => prevIndex - 1);
      setDate(prevDate);  // Update the date state
    }
  }, [currentDayIndex, date]);

  const handleEnergyChangeCallback = useCallback((value: string) => {
    const currentPatterns = state.energy_patterns || [];
    handleEnergyChange(dispatch, currentPatterns)(value);
  }, [dispatch, state.energy_patterns]);

  const handleDateSelect = useCallback(async (newDate: Date | undefined) => {
  if (!newDate) {
    setIsDropdownOpen(false);
    return;
  }

  setIsLoadingSchedule(true);
  try {
    const dateStr = formatDateToString(newDate);
    
    // Calculate date differences first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate);
    selectedDate.setHours(0, 0, 0, 0);
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Always update the date states regardless of schedule existence
    setCurrentDayIndex(diffDays);
    setDate(newDate);
    setCurrentDate(newDate);

    // Now try to load the schedule
    const existingSchedule = await loadScheduleForDate(dateStr);
    
    if (existingSchedule.success && existingSchedule.schedule) {
      // Update schedule states
      setScheduleCache(prevCache => new Map(prevCache).set(dateStr, existingSchedule.schedule!));
      setScheduleDays(prevDays => {
        // Preserve existing days and add/update the selected day
        const newDays = [...prevDays];
        newDays[diffDays] = existingSchedule.schedule!;
        return newDays;
      });

      toast({
        title: "Success",
        description: "Schedule loaded successfully",
      });
    } else {
      // Clear schedule for this day but keep the date states
      setScheduleDays(prevDays => {
        const newDays = [...prevDays];
        newDays[diffDays] = [];
        return newDays;
      });

      toast({
        title: "Notice",
        description: "No schedule found for selected date",
        variant: "default",
      });
    }
  } catch (error) {
    console.error("Error loading schedule:", error);
    toast({
      title: "Error",
      description: "Failed to load schedule",
      variant: "destructive",
    });
  } finally {
    setIsLoadingSchedule(false);
    setIsCalendarDrawerOpen(false);
    setIsDropdownOpen(false);
  }
}, [setDate, toast]);

// Handle magic wand click
const handleRequestSuggestions = useCallback(async () => {
  setIsLoadingSuggestions(true);
  
  try {
    const currentDate = getDateString(currentDayIndex);
    
    // Fetch new suggestions
    const response: GetAISuggestionsResponse = await fetchAISuggestions(
      state.name, // userId
      currentDate,
      scheduleDays[currentDayIndex] || [], // current schedule
      scheduleDays.slice(Math.max(0, currentDayIndex - 14), currentDayIndex), // Last 14 days
      state.priorities || {},
      state.energy_patterns || []
    );

    // Filter out previously shown suggestions
    const newSuggestions = response.suggestions.filter(
      suggestion => !shownSuggestionIds.has(suggestion.id)
    );

    // Update shown suggestions tracking
    newSuggestions.forEach(suggestion => {
      shownSuggestionIds.add(suggestion.id);
    });

    setSuggestions(newSuggestions);

  } catch (error) {
    console.error('Error requesting suggestions:', error);
    toast({
      title: "Error",
      description: error instanceof Error 
        ? error.message 
        : "Failed to get AI suggestions. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsLoadingSuggestions(false);
  }
}, [
  currentDayIndex,
  scheduleDays,
  state.name,
  state.priorities,
  state.energy_patterns,
  shownSuggestionIds,
  toast
]);

// Distribute suggestions between tasks when suggestions change
useEffect(() => {
  if (!suggestions.length) return;

  const currentSchedule = scheduleDays[currentDayIndex];
  if (!currentSchedule) return;

  // Create a new map for suggestions
  const newSuggestionsMap = new Map<string, AISuggestion[]>();
  
  suggestions.forEach(suggestion => {
    const relevantTaskId = findRelevantTaskForSuggestion(suggestion, currentSchedule);
    
    if (!newSuggestionsMap.has(relevantTaskId)) {
      newSuggestionsMap.set(relevantTaskId, []);
    }
    newSuggestionsMap.get(relevantTaskId)!.push(suggestion);
  });

  setSuggestionsMap(newSuggestionsMap);
}, [suggestions, currentDayIndex, scheduleDays]);


// Helper function to find relevant task for a suggestion
const findRelevantTaskForSuggestion = useCallback((
  suggestion: AISuggestion, 
  schedule: Task[]
): string => {
  // Start with category matching
  const categoryMatch = schedule.find(task => 
    task.categories?.some(category => 
      suggestion.categories.includes(category)
    )
  );
  if (categoryMatch) return categoryMatch.id;

  // Fallback to type-based placement
  switch (suggestion.type) {
    case 'Energy Optimization':
      // Place near morning tasks
      return schedule[0]?.id || 'schedule-start';
    case 'Priority Rebalancing':
      // Place near high-priority tasks
      const priorityTask = schedule.find(task => 
        task.categories?.includes('high-priority')
      );
      return priorityTask?.id || 'schedule-start';
    // Add other type-based logic...
    default:
      // Default to schedule start
      return 'schedule-start';
  }
}, []);

// Handle suggestion acceptance
const handleAcceptSuggestion = useCallback(async (suggestion: AISuggestion) => {
  try {
    // Convert suggestion to task with all required properties
    const newTask: Task = {
      id: uuidv4(),
      text: suggestion.text,
      categories: suggestion.categories,
      is_subtask: false,
      completed: false,
      is_section: false,
      section: null,
      parent_id: null,
      level: 0,
      section_index: 0,
      type: 'task',
      start_time: null,
      end_time: null,
      is_recurring: null,
      start_date: getDateString(currentDayIndex),
    };

    // Add task to schedule
    const updatedSchedule = [...scheduleDays[currentDayIndex]];
    const targetIndex = findTargetIndexForSuggestion(suggestion, updatedSchedule);
    
    // Update section and section_index for the new task and subsequent tasks
    if (targetIndex > 0) {
      const prevTask = updatedSchedule[targetIndex - 1];
      newTask.section = prevTask.section;
    }
    
    updatedSchedule.splice(targetIndex, 0, newTask);
    
    // Recalculate section_index for affected tasks
    let currentSection = null;
    let sectionStartIndex = 0;
    updatedSchedule.forEach((task, index) => {
      if (task.is_section) {
        currentSection = task.text;
        sectionStartIndex = index;
      }
      if (!task.is_section) {
        task.section_index = index - sectionStartIndex;
      }
    });

    // Update schedule
    setScheduleDays(prev => {
      const newDays = [...prev];
      newDays[currentDayIndex] = updatedSchedule;
      return newDays;
    });

    // Update both suggestions and suggestionsMap
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setSuggestionsMap(prev => {
      const newMap = new Map(prev);
      Array.from(newMap.entries()).forEach(([taskId, suggestions]) => {
        newMap.set(
          taskId, 
          suggestions.filter(s => s.id !== suggestion.id)
        );
      });
      return newMap;
    });

    // Sync with backend
    await updateScheduleForDate(
      getDateString(currentDayIndex),
      updatedSchedule
    );

    toast({
      title: "Success",
      description: "Suggestion added to schedule",
    });

  } catch (error) {
    console.error('Error accepting suggestion:', error);
    toast({
      title: "Error",
      description: "Failed to add suggestion to schedule",
      variant: "destructive",
    });
  }
}, [currentDayIndex, scheduleDays, toast]);

// Handle suggestion rejection
const handleRejectSuggestion = useCallback((suggestionId: string) => {
  // Update both suggestions and suggestionsMap
  setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  setSuggestionsMap(prev => {
    const newMap = new Map(prev);
    Array.from(newMap.entries()).forEach(([taskId, suggestions]) => {
      newMap.set(
        taskId, 
        suggestions.filter(s => s.id !== suggestionId)
      );
    });
    return newMap;
  });
}, []);

  // Helper function to find the best index to insert a suggestion
  const findTargetIndexForSuggestion = useCallback((
    suggestion: AISuggestion, 
    schedule: Task[]
  ): number => {
    // First try to find a task with matching categories
    const categoryMatchIndex = schedule.findIndex(task => 
      task.categories?.some(category => 
        suggestion.categories.includes(category)
      )
    );
    
    if (categoryMatchIndex !== -1) {
      // Insert after the matching task
      return categoryMatchIndex + 1;
    }

    // If no category match, use suggestion type to determine placement
    switch (suggestion.type) {
      case 'Energy Optimization':
        // Place near the start of the day
        return 0;
      
      case 'Priority Rebalancing':
        // Find first high-priority task
        const priorityIndex = schedule.findIndex(task => 
          task.categories?.includes('high-priority')
        );
        return priorityIndex !== -1 ? priorityIndex : 0;
      
      case 'Time Management':
        // Place in the middle of the schedule
        return Math.floor(schedule.length / 2);
      
      case 'Task Structure':
        // Place near related tasks if possible
        const structureIndex = schedule.findIndex(task => 
          task.text.toLowerCase().includes(suggestion.text.toLowerCase())
        );
        return structureIndex !== -1 ? structureIndex + 1 : schedule.length;
      
      default:
        // Default to end of schedule
        return schedule.length;
    }
  }, []);

  return (
    <div className="flex h-screen bg-[hsl(248,18%,4%)]">
      <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto main-content"> 
        {/* Header Component */}
        <DashboardHeader
          currentDayIndex={currentDayIndex}
          selectedDate={date}
          isLoadingSuggestions={isLoadingSuggestions}
          isCalendarDrawerOpen={isCalendarDrawerOpen}  // Updated prop name
          isDropdownOpen={isDropdownOpen}
          state={state}
          onRequestSuggestions={handleRequestSuggestions}
          onCalendarDrawerOpenChange={setIsCalendarDrawerOpen}  // Updated prop name
          onDropdownOpenChange={setIsDropdownOpen}
          onDateSelect={handleDateSelect}
          onSubmitForm={handleSubmit}
          isLoading={isLoading}
          onNextDay={handleNextDay}
          onPreviousDay={handlePreviousDay}
          currentDate={currentDate}
          dashboardLeftColProps={{
            newTask,
            setNewTask,
            priorities,
            updateTask,
            deleteTask,
            addTask,
            handleReorder,
            handleEnergyChange: handleEnergyChangeCallback,
          }}
        />
    
        {/* Schedule Display Section */}
        {isLoadingSchedule ? (
          // Loading State
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : scheduleDays.length > 0 && scheduleDays[currentDayIndex]?.length > 0 ? (
          // Schedule Content
          <div className="space-y-4">
            {/* Schedule Editor */}
            <div className="rounded-lg shadow-lg px-8 py-6">
              <EditableSchedule
                tasks={scheduleDays[currentDayIndex] || []}
                onUpdateTask={handleScheduleTaskUpdate}
                onDeleteTask={handleScheduleTaskDelete}
                onReorderTasks={handleReorderTasks}
                layoutPreference={state.layout_preference?.structure || 'unstructured'}
                onRequestSuggestions={handleRequestSuggestions}
                isLoadingSuggestions={isLoadingSuggestions}
                suggestionsMap={suggestionsMap}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
              />
            </div>
  
            {/* AI Suggestions Loading State */}
            {isLoadingSuggestions && (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-400">
                  Generating suggestions...
                </span>
              </div>
            )}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-lg text-gray-300">
              {state.response 
                ? 'Processing your schedule...' 
                : 'No schedule found for selected date'
              }
            </p>
            {/* Show Generate Button only if no response exists */}
            {!state.response && (
              <Button 
                variant="outline" 
                onClick={handleSubmit} 
                disabled={isLoading}
              >
                Generate Schedule
              </Button>
            )}
          </div>
        )}
        {/* Add FloatingActionButton and TaskEditDrawer here */}
        <FloatingActionButton onClick={() => setIsTaskDrawerOpen(true)} />
        <TaskEditDrawer
          isOpen={isTaskDrawerOpen}
          onClose={() => setIsTaskDrawerOpen(false)}
          onCreateTask={addTask}
          currentDate={getDateString(currentDayIndex)}
        />
      </div>
    </div>
  );
};

export default Dashboard;