import { UserDocument, Task } from '../types';
import { auth } from '@/auth/firebase';

// Use the calendar part of UserDocument type
type CalendarStatus = NonNullable<UserDocument['calendar']>;

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Get the current user's Firebase ID token for API authentication
 */
async function getAuthToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  return await currentUser.getIdToken();
}

export const calendarApi = {
  /**
   * Connect user's Google Calendar with stored credentials
   */
  async connectCalendar(credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    scopes: string[];
  }) {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/calendar/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ credentials }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to connect calendar');
    }
    
    return response.json();
  },

  /**
   * Disconnect user's Google Calendar
   */
  async disconnectCalendar() {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/calendar/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to disconnect calendar');
    }
    
    return response.json();
  },

  /**
   * Get calendar connection status for a user
   */
  async getCalendarStatus(userId: string): Promise<CalendarStatus> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/status/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get calendar status');
    }
    
    const result = await response.json();
    return result.data;
  },

  /**
   * Fetch Google Calendar events for a specific date and convert them to tasks
   * @param date - Date in YYYY-MM-DD format or Date object
   * @returns Promise containing tasks created from calendar events
   */
    async fetchEvents(date: string | Date): Promise<{
      success: boolean;
      tasks: Task[];
      count: number;
      date: string;
      error?: string;
    }> {
      // Convert Date object to string if needed
      const dateString = date instanceof Date 
        ? this.formatDateString(date) 
        : date;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return {
          success: false,
          tasks: [],
          count: 0,
          date: dateString,
          error: 'Invalid date format. Use YYYY-MM-DD'
        };
      }
  
      try {
        const token = await getAuthToken();
        const response = await fetch(
          `${API_BASE_URL}/api/calendar/events?date=${encodeURIComponent(dateString)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          return {
            success: false,
            tasks: [],
            count: 0,
            date: dateString,
            error: result.error || `Failed to fetch calendar events (${response.status})`
          };
        }
  
        return {
          success: true,
          tasks: result.tasks || [],
          count: result.count || 0,
          date: result.date || dateString,
        };
        
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        return {
          success: false,
          tasks: [],
          count: 0,
          date: dateString,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },

  /**
   * Check if user has calendar connected and credentials are valid
   */
  async hasValidCalendarConnection(): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const status = await this.getCalendarStatus(currentUser.uid);
      return status.connected && Boolean(status.credentials);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      return false;
    }
  },

  /**
   * Format date for API calls
   */
  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  },

  /**
   * Get today's date formatted for API
   */
  getTodayFormatted(): string {
    return this.formatDateForAPI(new Date());
  },

  /**
   * Format a date to YYYY-MM-DD string for API calls
   * @param date - Optional Date object (defaults to today if not provided)
   * @returns Date string in YYYY-MM-DD format
   */
  formatDateString(date?: Date): string {
    const targetDate = date || new Date();
    return targetDate.toISOString().split('T')[0];
  },
};