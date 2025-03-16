import { UserDocument } from '../types';

// Use the calendar part of UserDocument type
type CalendarStatus = NonNullable<UserDocument['calendar']>;

export const calendarApi = {
  async connectCalendar(userId: string, selectedCalendars: string[]) {
    const response = await fetch('/api/calendar/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, selectedCalendars }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to connect calendar');
    }
    
    return response.json();
  },

  async disconnectCalendar(userId: string) {
    const response = await fetch('/api/calendar/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to disconnect calendar');
    }
    
    return response.json();
  },

  async getCalendarStatus(userId: string): Promise<CalendarStatus> {
    const response = await fetch(`/api/calendar/status/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get calendar status');
    }
    
    return response.json();
  },

  async verifyCalendarPermissions(accessToken: string): Promise<{
    hasPermissions: boolean;
    availableCalendars?: Array<{
      id: string;
      summary: string;
      primary: boolean;
    }>;
    error?: string;
  }> {
    const response = await fetch('/api/calendar/verify-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to verify calendar permissions');
    }
    
    return response.json();
  }
};