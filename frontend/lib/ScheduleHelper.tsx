/**
 * Schedule Helper Module
 *
 * This module provides utilities for rendering, transforming, and managing schedules
 * received from the backend AI service. It handles different layout types and
 * schedule operations but does not implement ordering pattern logic,
 * which is handled by the AI service.
 */

// React and 3rd-party imports
import { v4 as uuidv4 } from 'uuid';
import { format as dateFormat } from 'date-fns';
import memoize from 'lodash/memoize';

// Types and Utils imports
import { 
  Task, 
  ScheduleLayoutType, 
  FormData, 
  ScheduleData,
  MonthWeek
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Schedule Layout Handler
 * 
 * Transforms tasks based on desired layout type for rendering purposes.
 * Note: This doesn't reorder tasks, just organizes them for display.
 * 
 * @param tasks - Tasks to transform
 * @param layoutType - The desired layout type
 * @returns Transformed tasks ready for rendering
 */
export const applyScheduleLayout = (
  tasks: Task[],
  layoutType: ScheduleLayoutType
): Task[] => {
  try {
    switch (layoutType) {
      case "todolist-structured":
        return formatStructuredTodoList(tasks);
        
      case "todolist-unstructured":
        return formatUnstructuredTodoList(tasks);
        
      // case "kanban":
      // case "calendar":
      //   // Future implementations
      //   console.log(`Layout type ${layoutType} not fully implemented yet, using structured view`);
      //   return formatStructuredTodoList(tasks);
        
      default:
        // Fallback to structured todolist
        return formatStructuredTodoList(tasks);
    }
  } catch (error) {
    console.error('Error applying schedule layout:', error);
    // Return original tasks as fallback
    return tasks;
  }
};

/**
 * Format tasks for structured to-do list layout
 * 
 * @param tasks - Tasks to format
 * @returns Formatted tasks
 */
const formatStructuredTodoList = (tasks: Task[]): Task[] => {
  let currentSection: string | null = null;
  let sectionStartIndex = 0;
  
  // Map tasks to include section information
  return tasks.map((task, index) => {
    if (task.is_section) {
      currentSection = task.text;
      sectionStartIndex = index;
      return {
        ...task,
        type: 'section',
        section: currentSection,
        section_index: 0
      };
    }
    return {
      ...task,
      type: 'task',
      section: currentSection,
      section_index: index - sectionStartIndex
    };
  });
};

/**
 * Format tasks for unstructured to-do list layout
 * 
 * @param tasks - Tasks to format
 * @returns Formatted tasks
 */
const formatUnstructuredTodoList = (tasks: Task[]): Task[] => {
  // Flat list of tasks without sections
  return tasks.map(task => ({
    ...task,
    section: null,
    section_index: 0,
    // Preserve the task's is_section property if it has one
    ...(task.is_section ? {} : { is_section: false })
  }));
};


/**
 * Determine if a task should recur on a given date
 * 
 * Checks if a recurring task should appear on the specified date based on its recurrence pattern.
 * 
 * @param task - The recurring task to check
 * @param targetDate - The date to check against
 * @returns Boolean indicating whether the task should recur on the target date
 */
export const shouldTaskRecurOnDate = (task: Task, targetDate: Date): boolean => {
  if (!task.is_recurring || typeof task.is_recurring !== 'object') return false;
  
  // Memoize expensive operations for performance
  const memoizedGetWeekOfMonth = memoize(getWeekOfMonth);
  const memoizedFormat = memoize((date: Date, format: string) => dateFormat(date, format));

  try {
    switch (task.is_recurring.frequency) {
      case 'daily':
        return true;

      case 'weekly':
        if (!task.is_recurring.dayOfWeek) return false;
        return memoizedFormat(targetDate, 'EEEE') === task.is_recurring.dayOfWeek;

      case 'monthly':
        if (!task.is_recurring.dayOfWeek || !task.is_recurring.weekOfMonth) return false;
        const targetDayOfWeek = memoizedFormat(targetDate, 'EEEE');
        const targetWeekOfMonth = memoizedGetWeekOfMonth(targetDate);
        return targetDayOfWeek === task.is_recurring.dayOfWeek && 
               targetWeekOfMonth === task.is_recurring.weekOfMonth;

      case 'none':
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking recurrence:', error);
    return false;
  }
};

/**
 * Get week of month for a date
 * 
 * Determines which week of the month a date falls in (first, second, third, fourth, or last).
 * 
 * @param date - The date to check
 * @returns The week of the month as a MonthWeek type
 */
export const getWeekOfMonth = (date: Date): MonthWeek => {
  const dayOfMonth = date.getDate();
  
  if (dayOfMonth >= 1 && dayOfMonth <= 7) return 'first';
  if (dayOfMonth >= 8 && dayOfMonth <= 14) return 'second';
  if (dayOfMonth >= 15 && dayOfMonth <= 21) return 'third';
  if (dayOfMonth >= 22 && dayOfMonth <= 28) return 'fourth';
  return 'last';
};

/**
 * Load a schedule for a specific date
 * 
 * Fetches a schedule from the API for the specified date.
 * 
 * @param date - The date to load the schedule for (format: "YYYY-MM-DD")
 * @returns Promise resolving to an object with the schedule or error information
 */
export const loadScheduleForDate = async (date: string): Promise<{ 
  success: boolean; 
  schedule?: Task[]; 
  error?: string 
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schedules/${date}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Schedule not found' };
      }
      throw new Error('Failed to fetch schedule');
    }

    const scheduleData = await response.json();
    // Check if tasks exist in the response
    if (!scheduleData.tasks) {
      return {
        success: false,
        error: 'Invalid schedule data format'
      };
    }

    return {
      success: true,
      schedule: scheduleData.tasks
    };
  } catch (error) {
    console.error("Error loading schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load schedule"
    };
  }
};

/**
 * Update an existing schedule
 * 
 * Updates a schedule in the database for the specified date.
 * 
 * @param date - The date of the schedule to update (format: "YYYY-MM-DD")
 * @param tasks - The updated tasks for the schedule
 * @returns Promise resolving to an object indicating success or failure
 */
export const updateScheduleForDate = async (
  date: string, 
  tasks: Task[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schedules/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });

    if (!response.ok) {
      throw new Error('Failed to update schedule');
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update schedule"
    };
  }
};

/**
 * Submit form data to generate a schedule
 * 
 * Sends user data to the backend API to generate a schedule.
 * This is a direct API call that should be used when we need to generate a new schedule.
 * 
 * @param formData - Form data containing user preferences and tasks
 * @returns API response with schedule data
 */
const submitFormDataToAPI = async (formData: FormData): Promise<any> => {
  console.log("Submitting form data to API for schedule generation");

  try {
    // Make API request to generate schedule
    const response = await fetch(`${API_BASE_URL}/api/submit_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    console.log("Response from schedule generation API:", data);
    return data;
  } catch (error) {
    console.error("Error submitting form data:", error);
    throw error;
  }
};

/**
 * Generate Schedule
 * 
 * Processes an existing schedule response or generates a new one by calling the API.
 * This function ensures schedules are only generated once from the backend during the user flow,
 * and can also format existing schedule data for the frontend.
 * 
 * @param formData - Form data containing user preferences and tasks
 * @param existingResponse - Optional existing response from a previous generation
 * @returns ScheduleData object with tasks arranged according to preferences
 */
export const generateSchedule = async (
  formData: FormData
): Promise<ScheduleData> => {
  try {
    const { layout_preference } = formData;
    
    console.log("Generating new schedule via API");
    const responseData = await submitFormDataToAPI(formData);
    
    if (!responseData || !Array.isArray(responseData.tasks)) {
      throw new Error("Invalid response: Missing structured data");
    }

    // Process structured data
    const processedTasks = responseData.tasks.map((task: Partial<Task>) => ({
      ...task,
      id: task.id || uuidv4(), // Ensure each task has an ID
      is_subtask: typeof task.is_subtask === 'boolean' ? task.is_subtask : false,
      parent_id: task.parent_id || null,
      level: typeof task.level === 'number' ? task.level : 0,
    }));
    
    // Apply frontend-specific layout formatting
    const formattedTasks = applyScheduleLayout(processedTasks, layout_preference.layout);
    
    // Return formatted schedule data
    return {
      tasks: formattedTasks,
      layout: layout_preference.layout,
      orderingPattern: layout_preference.orderingPattern,
      scheduleId: responseData.scheduleId,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTasks: formattedTasks.filter(task => !task.is_section).length,
        calendarEvents: formattedTasks.filter(task => Boolean(task.gcal_event_id)).length,
        recurringTasks: formattedTasks.filter(task => Boolean(task.is_recurring)).length
      }
    };
  } catch (error) {
    // Comprehensive error handling
    console.error('Error generating schedule:', error);
    
    // Return a minimal valid schedule on error to prevent UI crashes
    return {
      tasks: [],
      layout: formData.layout_preference.layout,
      orderingPattern: formData.layout_preference.orderingPattern,
      scheduleId: undefined,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTasks: 0,
        calendarEvents: 0,
        recurringTasks: 0,
        error: error instanceof Error ? error.message : "Unknown error generating schedule"
      }
    };
  }
};
