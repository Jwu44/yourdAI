import { categorizeTask } from './api';
import { v4 as uuidv4 } from 'uuid';
import type { FormData } from './types';
import { Task, FormAction, LayoutPreference, MonthWeek, RecurrenceType, DecompositionRequest, DecompositionResponse, MicrostepFeedback, FeedbackResponse  } from './types';
import { format as dateFormat } from 'date-fns';

const API_BASE_URL = 'http://localhost:8000/api';

const today = new Date().toISOString().split('T')[0];

interface ScheduleDocument {
  date: string;
  tasks: Task[];
  userId: string;
  inputs: {
    name: string;
    age: string;
    work_start_time: string;
    work_end_time: string;
    energy_patterns: string[];
    layout_preference: {
      structure: 'structured' | 'unstructured';
      subcategory: string;
      timeboxed: 'timeboxed' | 'untimeboxed';
    };
    priorities: {
      health: string;
      relationships: string;
      fun_activities: string;
      ambitions: string;
    };
    tasks: string[];
  };
  schedule: Task[];
  metadata?: {
    createdAt: string;
    lastModified: string;
  };
}

interface ScheduleResponse {
  _id: string;
  date: string;
  tasks: Task[];
  metadata: {
    createdAt: string;
    lastModified: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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
    const response = await fetch(`${API_BASE_URL}/submit_data`, {
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

export const extractSchedule = (response: any): string => {
  if (response && typeof response === 'object' && response.schedule) {
    return response.schedule;
  }
  
  if (typeof response === 'string') {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = response.match(scheduleRegex);
    if (match) return match[1].trim();
  }
  
  console.warn("No valid schedule found in the response.");
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

  // Extract schedule content from tags
  const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
  const match = scheduleText.match(scheduleRegex);
  if (!match) {
    console.error('No <schedule> tags found in the text');
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

  const scheduleContent = match[1].trim();
  const lines = scheduleContent.split('\n');
  let currentSection = '';
  let taskStack: Task[] = [];
  let tasks: Task[] = [];
  let sectionStartIndex = 0;
  
  // Use Set for efficient duplicate checking
  const processedTasks = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (trimmedLine.match(/^(Early Morning|Morning|Afternoon|Evening|Work Day|Night|High|Medium|Low|Fun|Ambition|Relationships|Work|Exercise)/i)) {
      currentSection = trimmedLine;
      sectionStartIndex = index;
      tasks.push(createSectionTask(trimmedLine, currentSection, sectionStartIndex));
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
const createSectionTask = (text: string, section: string, index: number): Task => ({
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

const createFullTask = async (
  line: string,
  currentSection: string,
  index: number,
  sectionStartIndex: number,
  inputTasks: Task[],
  layoutPreference: LayoutPreference
): Promise<Task | null> => {
  // Calculate indent level
  const indentLevel = line.search(/\S|$/) / 2;
  let taskText = line.replace(/^□ /, '').replace(/^- /, '');
  
  // Extract time information if layout is timeboxed
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (layoutPreference.timeboxed !== 'untimeboxed') {
    const timeMatch = taskText.match(/^(\d{1,2}:\d{2}(?:am|pm)?) - (\d{1,2}:\d{2}(?:am|pm)?):?\s*(.*)/i);
    if (timeMatch) {
      [, startTime, endTime, taskText] = timeMatch;
    }
  }

  // Find matching task from input tasks or categorize new task
  const matchingTask = inputTasks.find(t => t && taskText.toLowerCase().includes(t.text.toLowerCase()));
  let categories = matchingTask ? matchingTask.categories || [] : [];

  if (categories.length === 0) {
    try {
      const categorizedTask = await categorizeTask(taskText);
      categories = categorizedTask?.categories;
    } catch (error) {
      console.error("Error categorizing task:", error);
      categories = ['Uncategorized'];
    }
  }

  // Create and return the task object
  return {
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
    is_recurring: null, // might need to update
    start_date: today,
  };
};

const updateTaskHierarchy = (task: Task, taskStack: Task[]): void => {
  // Remove tasks from stack that are at a higher level than the current task
  while (taskStack.length > (task.level ?? 0)) {
    taskStack.pop();
  }

  // Set parent_id if there's a parent task
  if (taskStack.length > 0) {
    task.parent_id = taskStack[taskStack.length - 1].id;
  }

  // Add current task to the stack
  taskStack.push(task);
};

const syncParsedScheduleWithBackend = async (scheduleId: string, parsedTasks: Task[]): Promise<void> => {
  try {
    // Send parsed tasks to backend for syncing
    const response = await fetch(`${API_BASE_URL}/update_parsed_schedule`, {
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

export const generateNextDaySchedule = async (
  currentSchedule: Task[],
  userData: FormData,
  previousSchedules: Task[][] = []
): Promise<{ success: boolean; schedule?: Task[]; error?: string; warning?: string }> => {
  console.log("Starting next day schedule generation process");

  try {
    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // First, check if schedule for tomorrow already exists
    try {
      const existingSchedule = await loadScheduleForDate(tomorrowStr);
      if (existingSchedule.success && existingSchedule.schedule) {
        console.log("Found existing schedule for tomorrow");
        return existingSchedule;
      }
    } catch (error) {
      console.error("Error checking existing schedule:", error);
      // Continue with generation if check fails
    }

    // Step 1: Separate tasks into recurring and non-recurring
    // Use type predicate for better type safety
    const isRecurringTask = (task: Task): boolean => 
      task.is_recurring !== null && 
      typeof task.is_recurring === 'object' && 
      'frequency' in task.is_recurring;

    const { recurringTasks, nonRecurringTasks } = currentSchedule.reduce<{
      recurringTasks: Task[];
      nonRecurringTasks: Task[];
    }>(
      (acc, task) => {
        if (isRecurringTask(task)) {
          acc.recurringTasks.push(task);
        } else if (!task.is_section && !task.completed) {
          // Only include non-recurring, incomplete tasks
          acc.nonRecurringTasks.push(task);
        }
        return acc;
      },
      { recurringTasks: [], nonRecurringTasks: [] }
    );

    // Step 2: Get recurring tasks from both APIs with timeout and retry logic
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

    const [recurringTasksResponse, existingRecurringTasksResponse] = await Promise.all([
      fetchWithTimeout(`${API_BASE_URL}/identify_recurring_tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_schedule: currentSchedule,
          previous_schedules: previousSchedules
        })
      }),
      fetchWithTimeout(`${API_BASE_URL}/get_recurring_tasks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    ]).catch(error => {
      console.error("Error fetching recurring tasks:", error);
      throw new Error('Failed to fetch recurring tasks');
    });

    if (!recurringTasksResponse.ok || !existingRecurringTasksResponse.ok) {
      throw new Error('Failed to fetch recurring tasks');
    }

    const [recurringTasksData, existingRecurringTasksData] = await Promise.all([
      recurringTasksResponse.json(),
      existingRecurringTasksResponse.json()
    ]);

    // Step 3: Process recurring tasks for tomorrow using memoization
    const memoizedGetWeekOfMonth = memoize(getWeekOfMonth);
    const memoizedFormat = memoize((date: Date, format: string) => dateFormat(date, format));

    // Add type guard to check if task has valid recurring properties
    const isValidRecurringTask = (task: Task): task is Task & { 
      is_recurring: NonNullable<RecurrenceType> 
    } => {
      return task.is_recurring !== null && 
            task.is_recurring !== undefined && 
            typeof task.is_recurring === 'object' &&
            'frequency' in task.is_recurring;
    };

    // Update the shouldRecurTomorrow function with proper type checking
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

    // Process tasks in parallel using Promise.all for better performance
    const [recurringTasksForTomorrow, newRecurringTasks, existingRecurringTasks] = await Promise.all([
      // Process current schedule's recurring tasks
      Promise.resolve(recurringTasks
        .filter(shouldRecurTomorrow)
        .map(task => ({
          ...task,
          id: uuidv4(),
          completed: false,
          start_date: tomorrowStr
        }))),

      // Process newly identified recurring tasks
      Promise.resolve(recurringTasksData.recurring_tasks
        .filter((task: Task) => !recurringTasks.some(t => t.text === task.text))
        .map((task: Task) => ({
          ...task,
          id: uuidv4(),
          is_recurring: { frequency: 'daily' },
          completed: false,
          start_date: tomorrowStr
        }))),

      // Process existing recurring tasks
      Promise.resolve(existingRecurringTasksData.recurring_tasks
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

    // Step 4: Combine all tasks efficiently using Set for deduplication
    const taskSet = new Set<string>();
    const combinedTasks = [...nonRecurringTasks, ...recurringTasksForTomorrow, 
      ...newRecurringTasks, ...existingRecurringTasks]
      .filter(task => {
        // Skip deduplication for section tasks
        if (task.is_section) return true;
        // Only deduplicate non-section tasks
        if (taskSet.has(task.text)) return false;
        taskSet.add(task.text);
        return true;
      });

    // Step 5: Format schedule based on layout preference
    const layoutPreference: LayoutPreference = {
      structure: userData.layout_preference.structure as 'structured' | 'unstructured',
      subcategory: userData.layout_preference.subcategory,
      timeboxed: userData.layout_preference.timeboxed as 'timeboxed' | 'untimeboxed'
    };

    // Get sections from current schedule, ensuring uniqueness
    const currentSections = Array.from(new Set(
      currentSchedule
        .filter(task => task.is_section)
        .map(section => section.text)
    ));

    let formattedSchedule = layoutPreference.structure === 'structured'
      ? formatStructuredSchedule(
          // Filter out any section tasks from combinedTasks before formatting
          combinedTasks.filter(task => !task.is_section),
          currentSections,
          layoutPreference
        )
      : formatUnstructuredSchedule(combinedTasks, layoutPreference);

    // Step 6: Assign time slots if timeboxed
    if (layoutPreference.timeboxed === 'timeboxed') {
      formattedSchedule = assignTimeSlots(
        formattedSchedule, 
        userData.work_start_time, 
        userData.work_end_time
      );
    }

    // Step 7: Save to database with conflict resolution
    let warning: string | undefined;
    try {
      const scheduleDocument: ScheduleDocument = {
        date: `${tomorrowStr}T00:00:00`, // Match MongoDB format
        tasks: formattedSchedule,
        userId: userData.name, // Add userId from form data
        inputs: {  // Add inputs from current form data
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
        schedule: formattedSchedule, // Add schedule field
        metadata: {
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      };

      const saveResponse = await fetch(`${API_BASE_URL}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleDocument)
      });

      if (!saveResponse.ok) {
        if (saveResponse.status === 409) {
          // Handle conflict by updating existing schedule
          const updateResult = await updateScheduleForDate(tomorrowStr, formattedSchedule);
          if (!updateResult.success) {
            warning = 'Schedule generated but failed to update existing schedule';
          }
        } else {
          warning = 'Schedule generated but failed to save to database';
        }
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      warning = 'Schedule generated but failed to save to database';
    }

    return {
      success: true,
      schedule: formattedSchedule,
      warning
    };

  } catch (error) {
    console.error("Error generating next day schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate schedule"
    };
  }
};

// Update the memoize function type to be more flexible with parameter types
function memoize<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();
  return (...args: TArgs): TReturn => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Then use it with proper typing for the format function
const memoizedFormat = memoize<[Date, string], string>((date: Date, formatStr: string) => 
  dateFormat(date, formatStr)
);

// Similarly update getWeekOfMonth memoization
const memoizedGetWeekOfMonth = memoize<[Date], MonthWeek>((date: Date) => 
  getWeekOfMonth(date)
);

const getSectionsFromCurrentSchedule = (currentSchedule: Task[]): string[] => {
  return currentSchedule
    .filter(task => task.is_section)
    .map(section => section.text);
};

const formatStructuredSchedule = (
  tasks: Task[],
  sections: string[],
  layoutPreference: LayoutPreference
): Task[] => {
  const formattedSchedule: Task[] = [];

  sections.forEach(section => {
    formattedSchedule.push({
      id: `section-${section.toLowerCase().replace(/\s+/g, '-')}`,
      text: section,
      is_section: true,
      type: 'section',
      completed: false,
      categories: [],
      is_subtask: false,
      section: section,
      parent_id: null,
      level: 0,
      section_index: formattedSchedule.length,
      is_recurring: { frequency: 'daily' },
    });

    const sectionTasks = tasks.filter(task => task.section === section);
    formattedSchedule.push(...sectionTasks);
  });

  // Add tasks without a section at the end
  const tasksWithoutSection = tasks.filter(task => !task.section);
  if (tasksWithoutSection.length > 0) {
    const lastSection = sections[sections.length - 1] || 'Other Tasks';
    if (!formattedSchedule.some(task => task.text === lastSection)) {
      formattedSchedule.push({
        id: `section-${lastSection.toLowerCase().replace(/\s+/g, '-')}`,
        text: lastSection,
        is_section: true,
        type: 'section',
        completed: false,
        categories: [],
        is_subtask: false,
        section: lastSection,
        parent_id: null,
        level: 0,
        section_index: formattedSchedule.length,
        is_recurring: { frequency: 'daily' },
   
      });
    }
    formattedSchedule.push(...tasksWithoutSection.map(task => ({ ...task, section: lastSection })));
  }

  return formattedSchedule;
};

const formatUnstructuredSchedule = (tasks: Task[], layoutPreference: LayoutPreference): Task[] => {
  return tasks;
};

const assignTimeSlots = (schedule: Task[], workStartTime: string, workEndTime: string): Task[] => {
  const workStart = new Date(`1970-01-01T${workStartTime}`);
  const workEnd = new Date(`1970-01-01T${workEndTime}`);
  const totalMinutes = (workEnd.getTime() - workStart.getTime()) / 60000;
  const minutesPerTask = Math.floor(totalMinutes / schedule.filter(task => !task.is_section).length);

  let currentTime = new Date(workStart);

  return schedule.map(task => {
    if (task.is_section) return task;

    const startTime = currentTime.toTimeString().slice(0, 5);
    currentTime.setMinutes(currentTime.getMinutes() + minutesPerTask);
    const endTime = currentTime.toTimeString().slice(0, 5);

    return {
      ...task,
      start_time: startTime,
      end_time: endTime
    };
  });
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

  const today = new Date();
  const taskDate = task.start_date ? new Date(task.start_date) : today;
  
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
    const response = await fetch(`${API_BASE_URL}/schedules/${date}`, {
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
    const response = await fetch(`${API_BASE_URL}/schedules/${date}`, {
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
      `${API_BASE_URL}/schedules/range?start_date=${startDate}&end_date=${endDate}`,
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

    const response = await fetch(`${API_BASE_URL}/tasks/decompose`, {
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

    const response = await fetch(`${API_BASE_URL}/tasks/microstep-feedback`, {
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