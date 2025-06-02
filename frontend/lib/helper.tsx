import { categorizeTask } from './api/users';
import { v4 as uuidv4 } from 'uuid';
import { Task, FormAction, DecompositionRequest, 
  DecompositionResponse, MicrostepFeedback, FeedbackResponse, 
  FormData, GetAISuggestionsResponse } from './types';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const today = new Date().toISOString().split('T')[0];

export const handleSimpleInputChange = (setFormData: React.Dispatch<React.SetStateAction<FormData>>) => 
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

export const handleNestedInputChange = (setFormData: React.Dispatch<React.SetStateAction<FormData>>) => 
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const [category, subCategory] = name.split('.');
    setFormData(prevData => ({
      ...prevData,
      [category]: {
        ...prevData[category],
        [subCategory]: value
      }
    }));
  };

export const handleAddTask = async (tasks: Task[], newTask: string, categories: string[]) => {
  const result = await categorizeTask(newTask);
  const newTaskObject: Task = {
    id: uuidv4(),
    text: newTask.trim(),
    categories: (result?.categories) || categories,
    is_subtask: false,
    completed: false,
    is_section: false,
    section: null,
    parent_id: null,
    level: 0,
    section_index: tasks.length,
    type: "task",
    is_recurring: null,
    start_date: today,
  };
  return [...tasks, newTaskObject];
};

export const handleUpdateTask = (tasks: Task[], updatedTask: Task) => {
  return tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
};

export const handleDeleteTask = (tasks: Task[], taskId: string) => {
  return tasks.filter(task => task.id !== taskId);
};

// // ... existing code ...
// export const generateNextDaySchedule = async (
//   currentSchedule: Task[],
//   userData: FormData
// ): Promise<{
//   success: boolean;
//   schedule?: Task[];
//   error?: string;
//   warning?: string;
//   metadata: ScheduleMetadata;
// }> => {
//   console.log("Starting next day schedule generation process");

//   try {
//     // Calculate tomorrow's date
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     const tomorrowStr = tomorrow.toISOString().split('T')[0];

//     // Extract layout preferences from userData
//     const layoutPreference: EnhancedLayoutPreference = {
//       layout: userData.layout_preference.layout as ScheduleLayoutType,
//       subcategory: userData.layout_preference.subcategory,
//       orderingPattern: userData.layout_preference.orderingPattern as TaskOrderingPattern
//     };

//     try {
//       const existingSchedule = await loadScheduleForDate(tomorrowStr);
//       if (existingSchedule.success && existingSchedule.schedule) {
//         console.log("Found existing schedule for tomorrow");
//         return {
//           ...existingSchedule,
//           metadata: {
//             totalTasks: existingSchedule.schedule.filter(task => !task.is_section).length,
//             calendarEvents: existingSchedule.schedule.filter(task => Boolean(task.gcal_event_id)).length,
//             recurringTasks: existingSchedule.schedule.filter(task => Boolean(task.is_recurring)).length,
//             generatedAt: new Date().toISOString()
//           }
//         };
//       }
//     } catch (error) {
//       console.error("Error checking existing schedule:", error);
//       // Continue with generation if check fails
//     }

//     // Enhanced calendar sync with better error handling and type safety
//     let calendarTasks: Task[] = [];
//     const categoryCache: Record<string, string[]> = {}; // Cache for task categorization

//     if (userData.user?.calendar?.connected) {
//       try {
//         const calendarResponse = await fetch(`${API_BASE_URL}/api/calendar/sync/next-day`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ 
//             userId: userData.user.googleId,
//             date: tomorrowStr
//           })
//         });

//         if (!calendarResponse.ok) {
//           console.warn('Failed to sync calendar events:', await calendarResponse.text());
//         } else {
//           const calendarData = await calendarResponse.json();
//           if (calendarData.success && Array.isArray(calendarData.events)) {
//             // Convert calendar events to tasks in parallel with improved error handling
//             const calendarTaskPromises = calendarData.events.map((event: GoogleCalendarEvent) => 
//               convertGCalEventToTask(event, categoryCache, tomorrowStr)
//                 .catch(error => {
//                   console.error(`Failed to convert calendar event ${event.id}:`, error);
//                   return null;
//                 })
//             );

//             const calendarTaskResults = await Promise.all(calendarTaskPromises);
//             calendarTasks = calendarTaskResults.filter((task): task is Task => 
//               task !== null && !task.is_section
//             );

//             console.log(`Successfully synced ${calendarTasks.length} calendar events`);
//           }
//         }
//       } catch (error) {
//         console.error('Calendar sync error:', error);
//         // Continue with schedule generation even if calendar sync fails
//       }
//     }

//     // Step 1: Process tasks from current schedule
//     const { 
//       recurringTasks, 
//       unfinishedTasks, 
//       sections 
//     } = currentSchedule.reduce<{
//       recurringTasks: Task[];
//       unfinishedTasks: Task[];
//       sections: Task[];
//     }>(
//       (acc, task) => {
//         if (isValidRecurringTask(task)) {
//           acc.recurringTasks.push(task);
//         } else if (task.is_section) {
//           acc.sections.push(task);
//         } else if (!task.completed) {
//           // Roll over unfinished tasks
//           acc.unfinishedTasks.push(task);
//         }
//         return acc;
//       },
//       { recurringTasks: [], unfinishedTasks: [], sections: [] }
//     );
// // ... existing code ...
//     // Step 2: Get existing recurring tasks with timeout and error handling
//     let existingRecurringTasks: Task[] = [];
//     try {
//       const existingRecurringTasksResponse = await fetchWithTimeout(
//         `${API_BASE_URL}/api/get_recurring_tasks`,
//         {
//           method: 'GET',
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );

//       if (existingRecurringTasksResponse.ok) {
//         const existingRecurringTasksData = await existingRecurringTasksResponse.json();
//         existingRecurringTasks = existingRecurringTasksData.recurring_tasks || [];
//       } else {
//         console.warn('Failed to fetch recurring tasks:', await existingRecurringTasksResponse.text());
//       }
//     } catch (error) {
//       console.error("Error fetching recurring tasks:", error);
//       // Continue with empty existing recurring tasks
//     }

//     // Step 3: Process recurring tasks with memoization
//     const memoizedGetWeekOfMonth = memoize(getWeekOfMonth);
//     const memoizedFormat = memoize((date: Date, format: string) => dateFormat(date, format));

//     // Add shouldRecurTomorrow function that uses the memoized functions
//     const shouldRecurTomorrow = (task: Task): boolean => {
//       if (!isValidRecurringTask(task)) return false;
      
//       try {
//         switch (task.is_recurring.frequency) {
//           case 'daily':
//             return true;

//           case 'weekly':
//             if (!task.is_recurring.dayOfWeek) return false;
//             return memoizedFormat(tomorrow, 'EEEE') === task.is_recurring.dayOfWeek;

//           case 'monthly':
//             if (!task.is_recurring.dayOfWeek || !task.is_recurring.weekOfMonth) return false;
//             const tomorrowDayOfWeek = memoizedFormat(tomorrow, 'EEEE');
//             const tomorrowWeekOfMonth = memoizedGetWeekOfMonth(tomorrow);
//             return tomorrowDayOfWeek === task.is_recurring.dayOfWeek && 
//                    tomorrowWeekOfMonth === task.is_recurring.weekOfMonth;

//           default:
//             return false;
//         }
//       } catch (error) {
//         console.error('Error checking recurrence:', error);
//         return false;
//       }
//     };

//     // Process tasks in parallel with improved error handling
//     const [recurringTasksForTomorrow, existingRecurringForTomorrow] = await Promise.all([
//       // Process current schedule's recurring tasks
//       Promise.resolve(recurringTasks
//         .filter(shouldRecurTomorrow)
//         .map(task => ({
//           ...task,
//           id: uuidv4(),
//           completed: false,
//           start_date: tomorrowStr
//         }))),
//       // Process existing recurring tasks
//       Promise.resolve(existingRecurringTasks
//         .filter((task: Task) => 
//           shouldRecurTomorrow(task) && 
//           !recurringTasks.some(t => t.text === task.text)
//         )
//         .map((task: Task) => ({
//           ...task,
//           id: uuidv4(),
//           completed: false,
//           start_date: tomorrowStr
//         })))
//     ]);

//     // Step 4: Prepare unfinished tasks for rollover
//     const rolledOverTasks = unfinishedTasks.map(task => ({
//       ...task,
//       id: uuidv4(), // Generate new ID for the rolled over task
//       start_date: tomorrowStr,
//       // Preserve task state but ensure it's marked as not completed
//       completed: false
//     }));

//     // Step 5: Combine all tasks with proper ordering and deduplication
//     const taskSet = new Set<string>();
//     const combinedTasks = [
//       ...sections, // Preserve sections
//       ...calendarTasks, // Calendar tasks come first
//       ...rolledOverTasks, // Include rolled over unfinished tasks
//       ...recurringTasksForTomorrow,
//       ...existingRecurringForTomorrow
//     ].filter(task => {
//       if (task.is_section) return true;
//       // Deduplicate based on text and time
//       const taskKey = task.gcal_event_id ? 
//         `${task.text}-${task.start_time}-${task.end_time}` : 
//         task.text;
//       if (taskSet.has(taskKey)) return false;
//       taskSet.add(taskKey);
//       return true;
//     });

//     // Step 6: Format schedule based on user preferences
//     let formattedSchedule: Task[];
    
//     // Use the layout preference from userData
//     if (layoutPreference.layout === "todolist-structured") {
//       formattedSchedule = formatStructuredSchedule(
//         combinedTasks.filter(task => !task.is_section),
//         sections.map(section => section.text)
//       );
//     } 
//     // else if (layoutPreference.layout === "kanban") {
//     //   formattedSchedule = formatKanbanSchedule(combinedTasks);
//     // } 
//     else {
//       // Default to unstructured for other layouts
//       formattedSchedule = formatUnstructuredSchedule(combinedTasks);
//     }

//     // Step 7: Apply ordering pattern based on user preference
//     if (layoutPreference.orderingPattern === "timebox") {
//       formattedSchedule = assignTimeSlots(
//         formattedSchedule.map(task => {
//           // Preserve times for calendar events and tasks with existing times
//           if (task.gcal_event_id || (task.start_time && task.end_time)) {
//             return task;
//           }
//           return {
//             ...task,
//             start_time: undefined,
//             end_time: undefined
//           };
//         }),
//         userData.work_start_time,
//         userData.work_end_time
//       );
//     } else if (layoutPreference.orderingPattern === "batching") {
//       formattedSchedule = applyBatchingPattern(formattedSchedule);
//     } else if (layoutPreference.orderingPattern === "alternating") {
//       formattedSchedule = applyAlternatingPattern(formattedSchedule);
//     } else if (layoutPreference.orderingPattern === "three-three-three") {
//       formattedSchedule = applyThreeThreeThreePattern(formattedSchedule);
//     } else {
//       // For other patterns, clear times from non-calendar tasks
//       formattedSchedule = formattedSchedule.map(task => {
//         if (task.gcal_event_id) return task;
//         return {
//           ...task,
//           start_time: undefined,
//           end_time: undefined
//         };
//       });
//     }

//     // Step 8: Save to database with enhanced error handling
//     let warning: string | undefined;
//     try {
//       const scheduleDocument: ScheduleDocument = {
//         date: `${tomorrowStr}T00:00:00`,
//         tasks: formattedSchedule,
//         userId: userData.user?.googleId || userData.name, // Prefer googleId if available
//         inputs: {
//           name: userData.name,
//           age: userData.age,
//           work_start_time: userData.work_start_time,
//           work_end_time: userData.work_end_time,
//           energy_patterns: userData.energy_patterns,
//           layout_preference: layoutPreference,
//           priorities: userData.priorities,
//           tasks: userData.tasks.map(task => task.text)
//         },
//         schedule: formattedSchedule,
//         metadata: {
//           createdAt: new Date().toISOString(),
//           lastModified: new Date().toISOString(),
//           calendarSynced: Boolean(calendarTasks.length),
//           totalTasks: formattedSchedule.filter(task => !task.is_section).length,
//           calendarEvents: calendarTasks.length,
//           recurringTasks: recurringTasksForTomorrow.length + existingRecurringForTomorrow.length,
//           orderingPattern: layoutPreference.orderingPattern
//         }
//       };

//       // Attempt to save the schedule
//       const saveResponse = await fetch(`${API_BASE_URL}/api/schedules`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(scheduleDocument)
//       });

//       if (!saveResponse.ok) {
//         if (saveResponse.status === 409) {
//           // Handle conflict - schedule already exists
//           const updateResult = await updateScheduleForDate(tomorrowStr, formattedSchedule);
//           if (!updateResult.success) {
//             warning = 'Schedule generated but failed to update existing schedule';
//           }
//         } else {
//           const errorText = await saveResponse.text();
//           warning = `Schedule generated but failed to save to database: ${errorText}`;
//         }
//       }
//     } catch (error) {
//       console.error("Error saving schedule:", error);
//       warning = 'Schedule generated but failed to save to database';
//     }

//     // Step 9: Return the final result
//     return {
//       success: true,
//       schedule: formattedSchedule,
//       warning,
//       metadata: {
//         totalTasks: formattedSchedule.filter(task => !task.is_section).length,
//         calendarEvents: calendarTasks.length,
//         recurringTasks: recurringTasksForTomorrow.length + existingRecurringForTomorrow.length,
//         generatedAt: new Date().toISOString()
//       }
//     };
// // ... existing code ...
//   } catch (error) {
//     console.error("Error generating next day schedule:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Failed to generate schedule",
//       metadata: {
//         error: error instanceof Error ? error.stack : undefined,
//         generatedAt: new Date().toISOString()
//       }
//     };
//   }
// };

export const cleanupTasks = async (parsedTasks: Task[], existingTasks: Task[]): Promise<Task[]> => {
  const cleanedTasks = parsedTasks.map(task => {
    const matchingTask = existingTasks.find(t => t && t.id === task.id);
    return {
      ...task,
      categories: task.categories || (matchingTask ? matchingTask.categories : [])
    };
  });

  return cleanedTasks;
};

export const updatePriorities = (
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  priorities: { id: string }[]
): void => {
  const updatedPriorities = {
    health: '',
    relationships: '',
    fun_activities: '',
    ambitions: ''
  };
  priorities.forEach((priority, index) => {
    updatedPriorities[priority.id as keyof typeof updatedPriorities] = (index + 1).toString();
  });
  setFormData((prevData: FormData) => ({ ...prevData, priorities: updatedPriorities }));
};

export const handleEnergyChange = (
  dispatch: React.Dispatch<FormAction>,
  currentPatterns: string[]
) => (value: string): void => {
  const updatedPatterns = currentPatterns.includes(value)
    ? currentPatterns.filter(pattern => pattern !== value)
    : [...currentPatterns, value];
  
  dispatch({
    type: 'UPDATE_FIELD',
    field: 'energy_patterns',
    value: updatedPatterns
  });
};

// Add new functions for microstep operations
export const handleMicrostepDecomposition = async (
  task: Task,
  formData: FormData
): Promise<DecompositionResponse> => {
  try {
    const request: DecompositionRequest = {
      task,
      energy_patterns: formData.energy_patterns,
      priorities: formData.priorities,
      work_start_time: formData.work_start_time,
      work_end_time: formData.work_end_time
    };

    const response = await fetch(`${API_BASE_URL}/api/tasks/decompose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to decompose task');
    }

    const data = await response.json();
    console.log(data)
    return data;
  } catch (error) {
    console.error('Error decomposing task:', error);
    // Return empty array on error since DecompositionResponse is now string[]
    return [];
}
};

export const submitMicrostepFeedback = async (
  taskId: string,
  microstepId: string,
  accepted: boolean,
  completionOrder?: number
): Promise<FeedbackResponse> => {
  try {
    const feedback: MicrostepFeedback = {
      task_id: taskId,
      microstep_id: microstepId,
      accepted,
      completion_order: completionOrder,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${API_BASE_URL}/api/tasks/microstep-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit feedback');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting microstep feedback:', error);
    return {
      database_status: 'error',
      colab_status: 'error',
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
};

// Add helper function to handle microstep selection/rejection
export const handleMicrostepSelection = async (
  microstep: Task,
  accepted: boolean,
  tasks: Task[],
  onUpdateTask: (task: Task) => void
): Promise<void> => {
  try {
    if (!microstep.parent_id) return;

    // Submit feedback
    const feedbackResult = await submitMicrostepFeedback(
      microstep.parent_id,
      microstep.id,
      accepted
    );

    if (feedbackResult.database_status === 'error' || feedbackResult.colab_status === 'error') {
      console.warn('Feedback submission had errors:', feedbackResult);
    }

    if (accepted) {
      // Find parent task
      const parentTask = tasks.find(t => t.id === microstep.parent_id);
      if (!parentTask) return;

      // Get existing microsteps for this parent to determine position
      const existingMicrosteps = tasks.filter(
        t => t.parent_id === microstep.parent_id && t.is_microstep
      );

      // Create new task object from microstep
      const newSubtask: Task = {
        id: microstep.id,
        text: microstep.text,
        is_subtask: true,
        is_microstep: true,
        completed: false,
        is_section: false,
        section: parentTask.section,
        parent_id: parentTask.id,
        level: (parentTask.level || 0) + 1,
        section_index: (parentTask.section_index ?? 0) + existingMicrosteps.length + 1,
        type: 'microstep',
        categories: parentTask.categories || [],
        start_time: parentTask.start_time,
        end_time: parentTask.end_time,
        is_recurring: parentTask.is_recurring,
        start_date: parentTask.start_date
      };

      // Add the new subtask to tasks array
      onUpdateTask(newSubtask);
    }
  } catch (error) {
    console.error('Error handling microstep selection:', error);
  }
};

// Update existing functions to use new types
export const checkTaskCompletion = (task: Task, tasks: Task[]): boolean => {
  // If task has no microsteps, use its own completion state
  const microsteps = tasks.filter(
    t => t.parent_id === task.id && t.is_microstep
  );
  
  if (microsteps.length === 0) return task.completed;

  // Task is complete if all its microsteps are complete
  return microsteps.every(step => step.completed);
};

export const fetchAISuggestions = async (
  userId: string,
  date: string,
  currentSchedule: Task[],
  historicalSchedules: Task[][],
  priorities: Record<string, string>,
  energyPatterns: string[]
): Promise<GetAISuggestionsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schedule/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        date,
        currentSchedule,
        historicalSchedules,
        priorities,
        energyPatterns
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    throw error;
  }
};

export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a schedule exists for a specific date
 * @param date The date to check for schedule existence
 * @returns Promise<boolean> indicating if a schedule exists
 */
export const checkScheduleExists = async (date: Date): Promise<boolean> => {
  try {
    // Format date for API
    const dateStr = formatDateToString(date);
    
    // Use the range endpoint with a single day range for efficiency
    const response = await fetch(
      `${API_BASE_URL}/api/schedules/range?start_date=${dateStr}&end_date=${dateStr}`
    );

    if (!response.ok) {
      throw new Error('Failed to check schedule existence');
    }

    const data = await response.json();
    return data.schedules.length > 0;
  } catch (error) {
    console.error('Error checking schedule:', error);
    return false;
  }
};
