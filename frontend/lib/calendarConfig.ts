export const CALENDAR_CONFIG = {
    // API Endpoints
    CALENDAR_LIST_URL: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    CALENDAR_EVENTS_URL: 'https://www.googleapis.com/calendar/v3/calendars',
    
    // Scopes
    SCOPES: {
      READ_ONLY: 'https://www.googleapis.com/auth/calendar.readonly',
      EVENTS_READ_ONLY: 'https://www.googleapis.com/auth/calendar.events.readonly',
      CALENDAR_LIST_READ_ONLY: 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
    },
    
    // Default sync settings
    DEFAULT_SYNC_SETTINGS: {
      maxResults: 250,           // Maximum events to fetch per request
      syncToken: null,           // For incremental sync
      timeMin: new Date().toISOString(),  // Start from now
      singleEvents: true,        // Expand recurring events
      orderBy: 'startTime'       // Sort by start time
    },
    
    // Error messages
    ERRORS: {
      NO_ACCESS_TOKEN: 'No calendar access token available',
      SCOPE_NOT_GRANTED: 'Calendar access not granted',
      API_ERROR: 'Failed to access Google Calendar API',
      SYNC_ERROR: 'Calendar sync failed'
    }
  };
  
  // Calendar-specific utility types
  export type CalendarSyncStatus = 'never' | 'in_progress' | 'completed' | 'failed';
  
  export interface CalendarIntegrationState {
    connected: boolean;
    lastSyncTime: string | null;
    syncStatus: CalendarSyncStatus;
    selectedCalendars: string[];
    error: string | null;
  }