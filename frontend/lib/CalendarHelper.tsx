import { calendarApi } from '@/lib/api/calendar';
import { Task, FormData } from '@/lib/types';
import { categorizeTask } from '@/lib/api/users';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Sync today's calendar events and add them to the current schedule
 * @param userData - User's form data containing Google ID and preferences
 * @returns Promise with sync result
 */
export const syncTodaysCalendarEvents = async (userData: FormData): Promise<{
  success: boolean;
  tasks: Task[];
  count: number;
  error?: string;
}> => {
  try {
    console.log("Starting calendar sync for today");
    
    // Check if user has calendar connected
    if (!userData.user?.calendar?.connected) {
      console.log("User calendar not connected");
      return {
        success: false,
        tasks: [],
        count: 0,
        error: "Calendar not connected"
      };
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch calendar events using the calendar API
    const result = await calendarApi.fetchEvents(today);
    
    if (!result.success) {
      console.error("Failed to fetch calendar events:", result.error);
      return {
        success: false,
        tasks: [],
        count: 0,
        error: result.error
      };
    }

    console.log(`Successfully synced ${result.count} calendar events`);
    return result;
    
  } catch (error) {
    console.error("Error syncing today's calendar events:", error);
    return {
      success: false,
      tasks: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

/**
 * Check if user has calendar connected and valid credentials
 * @param userId - User's Google ID
 * @returns Promise<boolean> indicating if calendar is properly connected
 */
export const hasValidCalendarConnection = async (userId: string): Promise<boolean> => {
  try {
    const status = await calendarApi.getCalendarStatus(userId);
    return status.connected && Boolean(status.credentials);
  } catch (error) {
    console.error("Error checking calendar connection:", error);
    return false;
  }
};

/**
 * Convert a Google Calendar event to a yourdai Task
 * This is a client-side helper for manual event processing
 * @param event - Calendar event data
 * @param targetDate - Target date for the task
 * @returns Promise<Task | null>
 */
export const convertCalendarEventToTask = async (
  event: any, 
  targetDate: string
): Promise<Task | null> => {
  try {
    // Extract event details
    const eventName = event.summary || 'Untitled Event';
    
    // Skip cancelled events
    if (event.status === 'cancelled' || !eventName.trim()) {
      return null;
    }

    // Categorize the event
    let categories: string[] = ['Calendar'];
    try {
      const result = await categorizeTask(eventName);
      categories = result?.categories || ['Calendar'];
    } catch (error) {
      console.error('Error categorizing calendar event:', error);
    }

    // Extract start and end times
    let startTime: string | undefined;
    let endTime: string | undefined;

    if (event.start?.dateTime) {
      const startDt = new Date(event.start.dateTime);
      startTime = startDt.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }

    if (event.end?.dateTime) {
      const endDt = new Date(event.end.dateTime);
      endTime = endDt.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }

    // Create Task object
    const task: Task = {
      id: uuidv4(),
      text: eventName,
      categories,
      is_subtask: false,
      completed: false,
      is_section: false,
      section: null,
      parent_id: null,
      level: 0,
      section_index: 0,
      type: 'task',
      start_time: startTime,
      end_time: endTime,
      is_recurring: null,
      start_date: targetDate,
      gcal_event_id: event.id,
    };

    return task;

  } catch (error) {
    console.error('Error converting calendar event to task:', error);
    return null;
  }
};

/**
 * Sync calendar events for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @param userId - User's Google ID
 * @returns Promise with sync result
 */
export const syncCalendarEventsForDate = async (
  date: string, 
  userId: string
): Promise<{
  success: boolean;
  tasks: Task[];
  count: number;
  error?: string;
}> => {
  try {
    console.log(`Syncing calendar events for ${date}`);
    
    // Use the backend sync endpoint
    const response = await fetch(`${API_BASE_URL}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        date
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        tasks: [],
        count: 0,
        error: result.error || 'Failed to sync calendar events'
      };
    }

    return {
      success: true,
      tasks: result.events || [],
      count: result.eventsSynced || 0
    };

  } catch (error) {
    console.error(`Error syncing calendar events for ${date}:`, error);
    return {
      success: false,
      tasks: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Initialize calendar integration for a new user
 * This function should be called after successful calendar connection
 * @param userData - User's form data
 * @returns Promise with initialization result
 */
export const initializeCalendarIntegration = async (userData: FormData): Promise<{
  success: boolean;
  message: string;
  todaysTasks?: Task[];
}> => {
  try {
    console.log("Initializing calendar integration");
    
    // Check calendar connection
    if (!userData.user?.googleId) {
      throw new Error("User ID not available");
    }

    const hasConnection = await hasValidCalendarConnection(userData.user.googleId);
    if (!hasConnection) {
      throw new Error("Calendar not properly connected");
    }

    // Sync today's events
    const syncResult = await syncTodaysCalendarEvents(userData);
    
    if (syncResult.success) {
      return {
        success: true,
        message: `Calendar integration initialized. Synced ${syncResult.count} events for today.`,
        todaysTasks: syncResult.tasks
      };
    } else {
      return {
        success: false,
        message: `Calendar connected but sync failed: ${syncResult.error}`
      };
    }

  } catch (error) {
    console.error("Error initializing calendar integration:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to initialize calendar integration"
    };
  }
};
