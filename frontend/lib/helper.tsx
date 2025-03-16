import { categorizeTask } from './api/users';
import { v4 as uuidv4 } from 'uuid';
import { Task, ScheduleDocument, ScheduleResponse, ScheduleMetadata, TimeSlot, GoogleCalendarEvent, FormAction, LayoutPreference, WeekDay, MonthWeek, RecurrenceType, DecompositionRequest, DecompositionResponse, MicrostepFeedback, FeedbackResponse, FormData, GetAISuggestionsResponse  } from './types';
import { format as dateFormat } from 'date-fns';
import memoize from 'lodash/memoize'

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

export const submitFormData = async (formData: FormData) => {
  console.log("Form Data Before Submission:", formData);

  try {
    const response = await fetch(`${API_BASE_URL}/api/submit_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    console.log("Response from server:", data);
    return data;
  } catch (error) {
    console.error("Error submitting form:", error);
    throw error;
  }
};

export const extractSchedule = (
  response: ScheduleResponse | string, 
  preserveTags: boolean = false
): string => {
  // Handle response being an object with schedule property
  if (response && typeof response === 'object' && 'schedule' in response) {
    const scheduleStr = response.schedule;
    if (typeof scheduleStr === 'string') {
      const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
      const match = scheduleStr.match(scheduleRegex);
      if (match) {
        return preserveTags ? scheduleStr : match[1].trim();
      }
    }
    return String(scheduleStr); // Fallback
  }
  
  // Handle response with tasks array
  if (response && typeof response === 'object' && 'tasks' in response) {
    // Convert tasks array to schedule string format
    const content = response.tasks
      .map(task => {
        const indent = '  '.repeat(task.level || 0);
        return `${indent}${task.is_section ? task.text : `- ${task.text}`}`;
      })
      .join('\n');
    
    return preserveTags ? `<schedule>${content}</schedule>` : content;
  }
  
  // Handle direct string response
  if (typeof response === 'string') {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = response.match(scheduleRegex);
    if (match) {
      return preserveTags ? response : match[1].trim();
    }
  }
  
  console.warn("No valid schedule found in the response:", response);
  return '';
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

// Cache interface for categorization results
interface CategoryCache {
  [key: string]: string[];
}

export const parseScheduleToTasks = async (
  scheduleText: string,
  inputTasks: Task[] = [],
  layoutPreference: LayoutPreference,
  scheduleId: string 
): Promise<Task[]> => {
  // Validate input
  if (!scheduleText || typeof scheduleText !== 'string') {
    console.error('Invalid schedule text:', scheduleText);
    return [];
  }

  // Extract schedule content from tags if they exist
  const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
  const match = scheduleText.match(scheduleRegex);
  
  // Use either the matched content or the original text if no tags found
  const scheduleContent = match ? match[1].trim() : scheduleText.trim();
  
  if (!scheduleContent) {
    console.error('Empty schedule content');
    return [];
  }

  // Initialize categorization cache
  const categoryCache: CategoryCache = {};
  
  // Pre-populate cache with existing tasks
  inputTasks.forEach(task => {
    if (task.text && task.categories) {
      categoryCache[task.text.toLowerCase()] = task.categories;
    }
  });

  const lines = scheduleContent.split('\n');
  const taskStack: Task[] = [];
  const tasks: Task[] = [];
  let currentSection = '';
  let sectionStartIndex = 0;
  
  // Use Set for efficient duplicate checking
  const processedTasks = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (trimmedLine.match(/^(Early Morning|Morning|Afternoon|Evening|Work Day|Night|High|Medium|Low|Fun|Ambition|Relationships|Work|Exercise)/i)) {
      currentSection = trimmedLine;
      sectionStartIndex = index;
      tasks.push(createSectionTask(trimmedLine, currentSection));
    } else if (trimmedLine) {
      const indentLevel = line.search(/\S|$/) / 2;
      let taskText = trimmedLine.replace(/^□ /, '').replace(/^- /, '');
      
      // Extract time information if needed
      let startTime: string | null = null;
      let endTime: string | null = null;
      if (layoutPreference.timeboxed !== 'untimeboxed') {
        const timeMatch = taskText.match(/^(\d{1,2}:\d{2}(?:am|pm)?) - (\d{1,2}:\d{2}(?:am|pm)?):?\s*(.*)/i);
        if (timeMatch) {
          [, startTime, endTime, taskText] = timeMatch;
        }
      }

      // Skip if we've already processed this task text
      const taskKey = taskText.toLowerCase();
      if (!processedTasks.has(taskKey)) {
        processedTasks.add(taskKey);

        let categories: string[];
        
        // Check cache first
        if (categoryCache[taskKey]) {
          categories = categoryCache[taskKey];
        } else {
          // Only categorize if not in cache
          try {
            const result = await categorizeTask(taskText);
            categories = (result?.categories)|| ['Uncategorized'];
            // Cache the result
            categoryCache[taskKey] = categories;
          } catch (error) {
            console.error("Error categorizing task:", error);
            categories = ['Uncategorized'];
          }
        }

        const task: Task = {
          id: uuidv4(),
          text: taskText,
          categories,
          is_subtask: indentLevel > 0,
          completed: false,
          is_section: false,
          section: currentSection,
          parent_id: null,
          level: indentLevel,
          section_index: index - sectionStartIndex,
          type: 'task',
          start_time: startTime,
          end_time: endTime,
          is_recurring: null,
          start_date: new Date().toISOString().split('T')[0],
        };

        // Update task hierarchy
        while (taskStack.length > indentLevel) {
          taskStack.pop();
        }
        if (taskStack.length > 0) {
          task.parent_id = taskStack[taskStack.length - 1].id;
        }
        taskStack.push(task);
        tasks.push(task);
      }
    }
  }

  // Sync with backend
  try {
    await syncParsedScheduleWithBackend(scheduleId, tasks);
  } catch (error) {
    console.error("Failed to sync schedule with backend:", error);
  }

  return tasks;
};

// Helper function to create section tasks
const createSectionTask = (text: string, section: string ): Task => ({
  id: uuidv4(),
  text,
  categories: [],
  is_subtask: false,
  completed: false,
  is_section: true,
  section,
  parent_id: null,
  level: 0,
  section_index: 0,
  type: 'section',
  is_recurring: { frequency: 'daily' },
  start_date: new Date().toISOString().split('T')[0],
});

const syncParsedScheduleWithBackend = async (scheduleId: string, parsedTasks: Task[]): Promise<void> => {
  try {
    // Send parsed tasks to backend for syncing
    const response = await fetch(`${API_BASE_URL}/api/update_parsed_schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scheduleId,
        parsedTasks
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update parsed schedule');
    }

    console.log("Parsed schedule synced with backend");
  } catch (error) {
    console.error("Failed to sync parsed schedule with backend:", error);
    throw error;
  }
};

// Add this utility function before generateNextDaySchedule
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

const isValidRecurringTask = (task: Task): task is Task & { 
  is_recurring: NonNullable<RecurrenceType> 
} => {
  return task.is_recurring !== null && 
         task.is_recurring !== undefined && 
         typeof task.is_recurring === 'object' &&
         'frequency' in task.is_recurring;
};

export const generateNextDaySchedule = async (
  currentSchedule: Task[],
  userData: FormData
): Promise<{
  success: boolean;
  schedule?: Task[];
  error?: string;
  warning?: string;
  metadata: ScheduleMetadata;
}> => {
  console.log("Starting next day schedule generation process");

  try {
    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      const existingSchedule = await loadScheduleForDate(tomorrowStr);
      if (existingSchedule.success && existingSchedule.schedule) {
        console.log("Found existing schedule for tomorrow");
        return {
          ...existingSchedule,
          metadata: {
            totalTasks: existingSchedule.schedule.filter(task => !task.is_section).length,
            calendarEvents: existingSchedule.schedule.filter(task => Boolean(task.gcal_event_id)).length,
            recurringTasks: existingSchedule.schedule.filter(task => Boolean(task.is_recurring)).length,
            generatedAt: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error("Error checking existing schedule:", error);
      // Continue with generation if check fails
    }

    // Enhanced calendar sync with better error handling and type safety
    let calendarTasks: Task[] = [];
    const categoryCache: Record<string, string[]> = {}; // Cache for task categorization

    if (userData.user?.calendar?.connected) {
      try {
        const calendarResponse = await fetch(`${API_BASE_URL}/api/calendar/sync/next-day`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userData.user.googleId,
            date: tomorrowStr
          })
        });

        if (!calendarResponse.ok) {
          console.warn('Failed to sync calendar events:', await calendarResponse.text());
        } else {
          const calendarData = await calendarResponse.json();
          if (calendarData.success && Array.isArray(calendarData.events)) {
            // Convert calendar events to tasks in parallel with improved error handling
            const calendarTaskPromises = calendarData.events.map((event: GoogleCalendarEvent) => 
              convertGCalEventToTask(event, categoryCache, tomorrowStr)
                .catch(error => {
                  console.error(`Failed to convert calendar event ${event.id}:`, error);
                  return null;
                })
            );

            const calendarTaskResults = await Promise.all(calendarTaskPromises);
            calendarTasks = calendarTaskResults.filter((task): task is Task => 
              task !== null && !task.is_section
            );

            console.log(`Successfully synced ${calendarTasks.length} calendar events`);
          }
        }
      } catch (error) {
        console.error('Calendar sync error:', error);
        // Continue with schedule generation even if calendar sync fails
      }
    }

    // Step 1: Process recurring tasks
    const { recurringTasks, nonRecurringTasks } = currentSchedule.reduce<{
      recurringTasks: Task[];
      nonRecurringTasks: Task[];
    }>(
      (acc, task) => {
        if (isValidRecurringTask(task)) {
          acc.recurringTasks.push(task);
        } else if (!task.is_section && !task.completed) {
          acc.nonRecurringTasks.push(task);
        }
        return acc;
      },
      { recurringTasks: [], nonRecurringTasks: [] }
    );
    // Step 2: Get existing recurring tasks with timeout and error handling
    let existingRecurringTasks: Task[] = [];
    try {
      const existingRecurringTasksResponse = await fetchWithTimeout(
        `${API_BASE_URL}/api/get_recurring_tasks`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (existingRecurringTasksResponse.ok) {
        const existingRecurringTasksData = await existingRecurringTasksResponse.json();
        existingRecurringTasks = existingRecurringTasksData.recurring_tasks || [];
      } else {
        console.warn('Failed to fetch recurring tasks:', await existingRecurringTasksResponse.text());
      }
    } catch (error) {
      console.error("Error fetching recurring tasks:", error);
      // Continue with empty existing recurring tasks
    }

        // Step 3: Process recurring tasks with memoization
        const memoizedGetWeekOfMonth = memoize(getWeekOfMonth);
        const memoizedFormat = memoize((date: Date, format: string) => dateFormat(date, format));
    
        // Add shouldRecurTomorrow function that uses the memoized functions
        const shouldRecurTomorrow = (task: Task): boolean => {
          if (!isValidRecurringTask(task)) return false;
          
          try {
            switch (task.is_recurring.frequency) {
              case 'daily':
                return true;
    
              case 'weekly':
                if (!task.is_recurring.dayOfWeek) return false;
                return memoizedFormat(tomorrow, 'EEEE') === task.is_recurring.dayOfWeek;
    
              case 'monthly':
                if (!task.is_recurring.dayOfWeek || !task.is_recurring.weekOfMonth) return false;
                const tomorrowDayOfWeek = memoizedFormat(tomorrow, 'EEEE');
                const tomorrowWeekOfMonth = memoizedGetWeekOfMonth(tomorrow);
                return tomorrowDayOfWeek === task.is_recurring.dayOfWeek && 
                       tomorrowWeekOfMonth === task.is_recurring.weekOfMonth;
    
              default:
                return false;
            }
          } catch (error) {
            console.error('Error checking recurrence:', error);
            return false;
          }
        };
    
        // Process tasks in parallel with improved error handling
        const [recurringTasksForTomorrow, existingRecurringForTomorrow] = await Promise.all([
          // Process current schedule's recurring tasks
          Promise.resolve(recurringTasks
            .filter(shouldRecurTomorrow)
            .map(task => ({
              ...task,
              id: uuidv4(),
              completed: false,
              start_date: tomorrowStr
            }))),
          // Process existing recurring tasks
          Promise.resolve(existingRecurringTasks
            .filter((task: Task) => 
              shouldRecurTomorrow(task) && 
              !recurringTasks.some(t => t.text === task.text)
            )
            .map((task: Task) => ({
              ...task,
              id: uuidv4(),
              completed: false,
              start_date: tomorrowStr
            })))
        ]);

    // Step 4: Combine all tasks with proper ordering and deduplication
    const taskSet = new Set<string>();
    const combinedTasks = [
      ...calendarTasks, // Calendar tasks come first
      ...nonRecurringTasks,
      ...recurringTasksForTomorrow,
      ...existingRecurringForTomorrow
    ].filter(task => {
      if (task.is_section) return true;
      // Deduplicate based on text and time
      const taskKey = task.gcal_event_id ? 
        `${task.text}-${task.start_time}-${task.end_time}` : 
        task.text;
      if (taskSet.has(taskKey)) return false;
      taskSet.add(taskKey);
      return true;
    });

    // Step 5: Get existing sections and prepare layout preference
    const currentSections = Array.from(new Set(
      currentSchedule
        .filter(task => task.is_section)
        .map(section => section.text)
    ));

    const layoutPreference: LayoutPreference = {
      structure: userData.layout_preference.structure as 'structured' | 'unstructured',
      subcategory: userData.layout_preference.subcategory,
      timeboxed: userData.layout_preference.timeboxed as 'timeboxed' | 'untimeboxed'
    };

    // Step 6: Format schedule based on user preferences
    let formattedSchedule = layoutPreference.structure === 'structured'
      ? formatStructuredSchedule(
          combinedTasks.filter(task => !task.is_section),
          currentSections
        )
      : formatUnstructuredSchedule(combinedTasks);
    // Step 7: Assign time slots if needed
    if (layoutPreference.timeboxed === 'timeboxed') {
      formattedSchedule = assignTimeSlots(
        formattedSchedule.map(task => {
          // Preserve times for calendar events and tasks with existing times
          if (task.gcal_event_id || (task.start_time && task.end_time)) {
            return task;
          }
          return {
            ...task,
            start_time: undefined,
            end_time: undefined
          };
        }),
        userData.work_start_time,
        userData.work_end_time
      );
    } else {
      // For untimeboxed preference, clear times from non-calendar tasks
      formattedSchedule = formattedSchedule.map(task => {
        if (task.gcal_event_id) return task;
        return {
          ...task,
          start_time: undefined,
          end_time: undefined
        };
      });
    }

    // Step 8: Save to database with enhanced error handling
    let warning: string | undefined;
    try {
      const scheduleDocument: ScheduleDocument = {
        date: `${tomorrowStr}T00:00:00`,
        tasks: formattedSchedule,
        userId: userData.user?.googleId || userData.name, // Prefer googleId if available
        inputs: {
          name: userData.name,
          age: userData.age,
          work_start_time: userData.work_start_time,
          work_end_time: userData.work_end_time,
          energy_patterns: userData.energy_patterns,
          layout_preference: {
            structure: userData.layout_preference.structure as 'structured' | 'unstructured',
            subcategory: userData.layout_preference.subcategory,
            timeboxed: userData.layout_preference.timeboxed as 'timeboxed' | 'untimeboxed'
          },
          priorities: userData.priorities,
          tasks: userData.tasks.map(task => task.text)
        },
        schedule: formattedSchedule,
        metadata: {
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          calendarSynced: Boolean(calendarTasks.length),
          totalTasks: formattedSchedule.filter(task => !task.is_section).length,
          calendarEvents: calendarTasks.length
        }
      };

      // Attempt to save the schedule
      const saveResponse = await fetch(`${API_BASE_URL}/api/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleDocument)
      });

      if (!saveResponse.ok) {
        if (saveResponse.status === 409) {
          // Handle conflict - schedule already exists
          const updateResult = await updateScheduleForDate(tomorrowStr, formattedSchedule);
          if (!updateResult.success) {
            warning = 'Schedule generated but failed to update existing schedule';
          }
        } else {
          const errorText = await saveResponse.text();
          warning = `Schedule generated but failed to save to database: ${errorText}`;
        }
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      warning = 'Schedule generated but failed to save to database';
    }

    // Step 9: Return the final result
    return {
      success: true,
      schedule: formattedSchedule,
      warning,
      metadata: {
        totalTasks: formattedSchedule.filter(task => !task.is_section).length,
        calendarEvents: calendarTasks.length,
        recurringTasks: recurringTasksForTomorrow.length + existingRecurringForTomorrow.length,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error("Error generating next day schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate schedule",
      metadata: {
        error: error instanceof Error ? error.stack : undefined,
        generatedAt: new Date().toISOString()
      }
    };
  }
};

// Helper function to parse time strings
const parseTimeString = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatStructuredSchedule = (
  tasks: Task[],
  sections: string[],
): Task[] => {
  // First, sort calendar events by start time to handle overlapping events
  const sortedTasks = [...tasks].sort((a, b) => {
    // Calendar events come first, sorted by start time
    const aIsCalendar = Boolean(a.gcal_event_id);
    const bIsCalendar = Boolean(b.gcal_event_id);
    
    if (aIsCalendar && bIsCalendar) {
      // If both are calendar events, sort by start time
      if (!a.start_time || !b.start_time) return 0;
      return parseTimeString(a.start_time) - parseTimeString(b.start_time);
    }
    // Calendar events come before non-calendar tasks
    if (aIsCalendar) return -1;
    if (bIsCalendar) return 1;
    return 0;
  });

  // Group tasks by their categories
  const tasksBySection = sortedTasks.reduce<Record<string, Task[]>>((acc, task) => {
    // Determine the appropriate section
    let section: string;
    if (task.gcal_event_id) {
      // Use the first matching section from categories, or 'Calendar' as fallback
      section = task.categories?.find(cat => sections.includes(cat)) || 'Calendar';
    } else {
      // For non-calendar tasks, use first category or 'Uncategorized'
      section = task.categories?.[0] || 'Uncategorized';
    }

    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(task);
    return acc;
  }, {});

  // Create the formatted schedule with sections
  const formattedSchedule: Task[] = [];
  
  // Ensure 'Calendar' section comes first if it exists and has tasks
  const orderedSections = ['Calendar', ...sections.filter(s => s !== 'Calendar')]
    .filter(section => tasksBySection[section]?.length > 0);

  orderedSections.forEach((section, index) => {
    // Add section header
    formattedSchedule.push({
      id: uuidv4(),
      text: section,
      is_section: true,
      completed: false,
      section: null,
      is_subtask: false,
      parent_id: null,
      level: 0,
      section_index: index,
      type: 'section',
      categories: [],
      start_date: undefined
    });

    // Add tasks for this section
    const sectionTasks = tasksBySection[section] || [];
    
    // For calendar events in the same section, ensure they're properly ordered
    if (section === 'Calendar' || sectionTasks.some(task => task.gcal_event_id)) {
      sectionTasks.sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return parseTimeString(a.start_time) - parseTimeString(b.start_time);
      });
    }

    sectionTasks.forEach(task => {
      formattedSchedule.push({
        ...task,
        section: section,
        section_index: index
      });
    });
  });

  return formattedSchedule;
};

const formatUnstructuredSchedule = (
  tasks: Task[],
): Task[] => {
  // Sort tasks: calendar events first (sorted by time), then other tasks
  return tasks
    .sort((a, b) => {
      const aIsCalendar = Boolean(a.gcal_event_id);
      const bIsCalendar = Boolean(b.gcal_event_id);
      
      if (aIsCalendar && bIsCalendar) {
        // Both are calendar events, sort by start time
        if (!a.start_time || !b.start_time) return 0;
        return parseTimeString(a.start_time) - parseTimeString(b.start_time);
      }
      // Calendar events come first
      if (aIsCalendar) return -1;
      if (bIsCalendar) return 1;
      return 0;
    })
    .map(task => ({
      ...task,
      section: null,
      section_index: 0
    }));
};

const assignTimeSlots = (
  schedule: Task[], 
  workStartTime: string, 
  workEndTime: string
): Task[] => {
  // Return early if no tasks need time slots
  if (schedule.length === 0) return schedule;

  // Separate calendar events and other tasks
  const calendarTasks = schedule.filter(task => 
    !task.is_section && task.gcal_event_id && task.start_time && task.end_time
  );
  const regularTasks = schedule.filter(task => 
    !task.is_section && !task.gcal_event_id && !task.start_time
  );
  const tasksWithExistingTimes = schedule.filter(task => 
    !task.is_section && !task.gcal_event_id && task.start_time && task.end_time
  );
  
  // Initialize available time slots
  let availableSlots: TimeSlot[] = [{
    start: workStartTime,
    end: workEndTime,
    isOccupied: false
  }];

  // Mark slots as occupied for calendar events and existing timed tasks
  [...calendarTasks, ...tasksWithExistingTimes].forEach(task => {
    if (!task.start_time || !task.end_time) return;
    
    const taskStart = parseTimeString(task.start_time);
    const taskEnd = parseTimeString(task.end_time);
    
    // Split or remove affected time slots
    availableSlots = availableSlots.reduce<TimeSlot[]>((acc, slot) => {
      const slotStart = parseTimeString(slot.start);
      const slotEnd = parseTimeString(slot.end);
      
      if (slot.isOccupied || slotEnd <= taskStart || slotStart >= taskEnd) {
        // Slot is already occupied or doesn't overlap with task
        acc.push(slot);
      } else {
        // Create slots before and after the task if there's space
        if (slotStart < taskStart) {
          acc.push({
            start: slot.start,
            end: formatTimeString(taskStart),
            isOccupied: false
          });
        }
        if (slotEnd > taskEnd) {
          acc.push({
            start: formatTimeString(taskEnd),
            end: slot.end,
            isOccupied: false
          });
        }
      }
      return acc;
    }, []);
  });

  // Calculate time per remaining task
  const totalAvailableMinutes = availableSlots.reduce((total, slot) => {
    const slotStart = parseTimeString(slot.start);
    const slotEnd = parseTimeString(slot.end);
    return total + (slotEnd - slotStart);
  }, 0);
  
  const minutesPerTask = Math.floor(totalAvailableMinutes / regularTasks.length);

  // Assign time slots to regular tasks
  let currentSlotIndex = 0;
  let currentMinutesInSlot = 0;
  
  const assignedRegularTasks = regularTasks.map(task => {
    // Find next available slot
    while (
      currentSlotIndex < availableSlots.length && 
      currentMinutesInSlot >= parseTimeString(availableSlots[currentSlotIndex].end) - 
      parseTimeString(availableSlots[currentSlotIndex].start)
    ) {
      currentSlotIndex++;
      currentMinutesInSlot = 0;
    }

    if (currentSlotIndex >= availableSlots.length) {
      // No more slots available, return task without times
      return task;
    }

    const currentSlot = availableSlots[currentSlotIndex];
    const slotStart = parseTimeString(currentSlot.start);
    const taskStart = slotStart + currentMinutesInSlot;
    const taskEnd = Math.min(taskStart + minutesPerTask, parseTimeString(currentSlot.end));
    
    currentMinutesInSlot += minutesPerTask;

    return {
      ...task,
      start_time: formatTimeString(taskStart),
      end_time: formatTimeString(taskEnd)
    };
  });

  // Combine all tasks back together in the correct order
  return schedule.map(task => {
    if (task.is_section) return task;
    if (task.gcal_event_id || (task.start_time && task.end_time)) return task;
    return assignedRegularTasks.find(t => t.id === task.id) || task;
  });
};

// Helper function to format time string from minutes
const formatTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

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

// Helper function to check if a task should recur on a given date
export const shouldTaskRecurOnDate = (task: Task, targetDate: Date): boolean => {
  if (!task.is_recurring || typeof task.is_recurring !== 'object') return false;
  
  switch (task.is_recurring.frequency) {
    case 'daily':
      return true;

    case 'weekly':
      if (!task.is_recurring.dayOfWeek) return false;
      // Check if target date falls on the specified day of week
      return dateFormat(targetDate, 'EEEE') === task.is_recurring.dayOfWeek;

    case 'monthly':
      if (!task.is_recurring.dayOfWeek || !task.is_recurring.weekOfMonth) return false;
      
      // Check if target date matches the specified week and day
      const targetDayOfWeek = dateFormat(targetDate, 'EEEE');
      const targetWeekOfMonth = getWeekOfMonth(targetDate);
      
      return targetDayOfWeek === task.is_recurring.dayOfWeek && 
             targetWeekOfMonth === task.is_recurring.weekOfMonth;

    case 'none':
    default:
      return false;
  }
};

// Helper function to get week of month
const getWeekOfMonth = (date: Date): MonthWeek => {
  const dayOfMonth = date.getDate();
  
  if (dayOfMonth >= 1 && dayOfMonth <= 7) return 'first';
  if (dayOfMonth >= 8 && dayOfMonth <= 14) return 'second';
  if (dayOfMonth >= 15 && dayOfMonth <= 21) return 'third';
  if (dayOfMonth >= 22 && dayOfMonth <= 28) return 'fourth';
  return 'last';
};

// Add new function to load schedule for a specific date
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

// Add function to update existing schedule
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

// Add new function to load schedules for a date range
export const loadSchedulesRange = async (
  startDate: string,
  endDate: string
): Promise<{ 
  success: boolean; 
  schedules?: Map<string, Task[]>; 
  error?: string 
}> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/schedules/range?start_date=${startDate}&end_date=${endDate}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch schedules');
    }

    const data = await response.json();
    const scheduleMap = new Map<string, Task[]>();
    
    data.schedules.forEach((schedule: ScheduleResponse) => {
      const dateStr = schedule.date.split('T')[0];
      scheduleMap.set(dateStr, schedule.tasks);
    });

    return {
      success: true,
      schedules: scheduleMap
    };
  } catch (error) {
    console.error("Error loading schedules range:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load schedules"
    };
  }
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

// Helper function to convert Google Calendar event to Task
const convertGCalEventToTask = async (
  event: GoogleCalendarEvent,
  categoryCache: Record<string, string[]>,
  targetDate: string  // Add target date parameter
): Promise<Task | null> => {
  try {
    // Extract event details
    const eventName = event.summary;
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);
    
    // Adjust times for events spanning days
    let startTime: string | undefined;
    let endTime: string | undefined;

    // If event starts before target date, set start time to midnight
    if (eventStart.toISOString().split('T')[0] < targetDate) {
      startTime = '00:00';
    } else {
      startTime = eventStart.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }

    // If event ends after target date, only include if it started on or before target date
    if (eventEnd.toISOString().split('T')[0] > targetDate) {
      if (eventStart.toISOString().split('T')[0] > targetDate) {
        return null; // Skip this event as it's for a future date
      }
      endTime = '23:59';
    } else {
      endTime = eventEnd.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }

    // Determine recurrence (unchanged)
    let recurrence: RecurrenceType | null = null;
    if (event.recurrence) {
      const rrule = event.recurrence[0];
      recurrence = parseRRuleToRecurrenceType(rrule);
    }

    // Get categories (unchanged)
    let categories: string[];
    const cacheKey = eventName.toLowerCase();
    if (categoryCache[cacheKey]) {
      categories = categoryCache[cacheKey];
    } else {
      try {
        const result = await categorizeTask(eventName);
        categories = result?.categories || ['Uncategorized'];
        categoryCache[cacheKey] = categories;
      } catch (error) {
        console.error('Error categorizing calendar event:', error);
        categories = ['Uncategorized'];
      }
    }

    return {
      id: uuidv4(),
      text: eventName,
      categories,
      is_subtask: false,
      completed: false,
      is_section: false,
      section: null, // Will be assigned later based on categories
      parent_id: null,
      level: 0,
      section_index: 0, // Will be updated when formatting schedule
      type: 'task',
      start_time: startTime,
      end_time: endTime,
      is_recurring: recurrence,
      start_date: targetDate,
      gcal_event_id: event.id
    };
  } catch (error) {
    console.error('Error converting calendar event to task:', error);
    return null;
  }
};

// Helper function to parse Google Calendar RRULE to our RecurrenceType
const parseRRuleToRecurrenceType = (rrule: string): RecurrenceType | null => {
  // Define day mapping with proper WeekDay type
  const dayMap: Record<string, WeekDay> = {
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
    SU: 'Sunday'
  } as const;

  // Define week mapping with proper MonthWeek type
  const weekMap: Record<number, MonthWeek> = {
    1: 'first',
    2: 'second',
    3: 'third',
    4: 'fourth',
    [-1]: 'last'
  } as const;

  try {
    if (rrule.includes('FREQ=DAILY')) {
      return { frequency: 'daily' };
    } 
    
    if (rrule.includes('FREQ=WEEKLY')) {
      const dayMatch = rrule.match(/BYDAY=([A-Z]{2})/);
      if (dayMatch && dayMatch[1] && dayMatch[1] in dayMap) {
        return {
          frequency: 'weekly',
          dayOfWeek: dayMap[dayMatch[1]]
        };
      }
    } 
    
    if (rrule.includes('FREQ=MONTHLY')) {
      const monthlyMatch = rrule.match(/BYDAY=(\d{1}|-\d{1})([A-Z]{2})/);
      if (monthlyMatch && monthlyMatch[1] && monthlyMatch[2]) {
        const weekNumber = parseInt(monthlyMatch[1]);
        const dayCode = monthlyMatch[2];

        if (weekNumber in weekMap && dayCode in dayMap) {
          return {
            frequency: 'monthly',
            dayOfWeek: dayMap[dayCode],
            weekOfMonth: weekMap[weekNumber]
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing RRULE:', error);
    return null;
  }
};
