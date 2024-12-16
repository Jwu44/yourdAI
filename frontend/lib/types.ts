export interface Task {
  id: string;
  text: string;
  categories?: string[];
  completed: boolean;
  is_subtask?: boolean;
  is_section?: boolean;
  section?: string | null;
  parent_id?: string | null;
  level?: number;
  section_index?: number;
  type?: string;
  start_time?: string | null;
  end_time?: string | null;
  is_recurring?: RecurrenceType | null;
  start_date?: string;
  is_microstep?: boolean;
  rationale?: string;
  estimated_time?: string;
  energy_level_required?: 'low' | 'medium' | 'high';
  gcal_event_id?: string; 
}

export interface FormData {
  user?: UserDocument; 
  work_start_time: string;
  work_end_time: string;
  tasks: Task[];
  energy_patterns: string[];
  priorities: {
    health: string;
    relationships: string;
    fun_activities: string;
    ambitions: string;
  };
  layout_preference: {
    structure: string;
    subcategory: string;
    timeboxed: string;
  };
  [key: string]: any;
  scheduleId?: string;
  response?: string;
}

export interface Priority {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}


export interface MicrostepFeedback {
  task_id: string;
  microstep_id: string;
  accepted: boolean;
  completion_order?: number;
  timestamp?: string;
}

// Add new type for decomposition cache
export interface DecompositionCacheEntry {
  taskText: string;
  categories: string[];
  microsteps: Task[];
  successRate: number;
  lastUsed: string;
  totalSuggestions: number;
  acceptedSuggestions: number;
}

export interface DecompositionRequest {
  task: Task;
  energy_patterns: string[];
  priorities: Record<string, string>;
  work_start_time: string;
  work_end_time: string;
}

// Update the interface to reflect the new response format
export type DecompositionResponse = string[];  // Array of microstep texts

export interface FeedbackResponse {
  database_status: 'success' | 'error';
  colab_status: 'success' | 'error';
  error?: string;
}

// Utility type for nested update
export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`
}[keyof T & (string | number)];

export type FormAction = {
  type: 'UPDATE_FIELD';
  field: string;
  value: any;
} | {
  type: 'UPDATE_NESTED_FIELD';
  field: string;
  subField: string;
  value: any;
} | {
  type: 'UPDATE_TASK';
  task: Task;
} | {
  type: 'RESET_FORM';
};

export interface LayoutPreference {
  structure: 'structured' | 'unstructured';
  subcategory: string;
  timeboxed: 'timeboxed' | 'untimeboxed';
}

// Add a new type for the form context
export interface FormContextType {
  state: FormData;
  dispatch: React.Dispatch<FormAction>;
}

// Add new types for recurrence
export type WeekDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type MonthWeek = 'first' | 'second' | 'third' | 'fourth' | 'last';

export type RecurrenceType = {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  dayOfWeek?: WeekDay;
  weekOfMonth?: MonthWeek;
};

export interface TaskEditFormData {
  text: string;
  categories: string[];
  start_time?: string | null;
  end_time?: string | null;
  is_recurring: RecurrenceType;
}

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly on {day}' }, // Template for weekly
  { value: 'monthly', label: 'Monthly on the {week} {day}' }, // Template for monthly
];

export type SuggestionType = 
  | "Energy Optimization"
  | "Procrastination Prevention"
  | "Priority Rebalancing"
  | "Task Structure"
  | "Time Management";

export interface AISuggestion {
  id: string;
  text: string;
  type: SuggestionType;
  rationale: string;
  confidence: number;
  categories: string[];
  user_id: string;
  date: string;
}

export interface GetAISuggestionsResponse {
  suggestions: AISuggestion[];
  metadata: {
    generated_at: string;
    count: number;
  };
}

export interface CalendarCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

// Add new user-related interfaces
export interface UserDocument {
  googleId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  calendarSynced: boolean;
  lastLogin: string;
  createdAt: string;
  metadata?: {
    lastModified: string;
  };
  calendar?: {
    connected: boolean;
    credentials?: CalendarCredentials;
    lastSyncTime: string | null;
    syncStatus: 'never' | 'in_progress' | 'completed' | 'failed';
    selectedCalendars: string[];
    error: string | null;
    settings?: {
      autoSync: boolean;
      syncFrequency: number;
      defaultReminders: boolean;
    };
  };
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string; };
  end: { dateTime: string; timeZone: string; };
  recurringEventId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: string;
  updated: string;
  creator: { email: string; displayName?: string; };
  organizer: { email: string; displayName?: string; };
}

export type UserRole = 'free' | 'premium' | 'admin';

export interface AuthResponse {
  message: string;
  user: UserDocument;
  isNewUser?: boolean;
}

// Backend API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthState {
  user: UserDocument | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// Python backend response types
export interface PythonBackendResponse<T> {
  message?: string;
  error?: string;
  data?: T;
  status: 'success' | 'error';
}

// Session types
export interface SessionData {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface ScheduleDocument {
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
    priorities: Record<string, string>;
    tasks: string[];
  };
  schedule: Task[];
  metadata: {
    createdAt: string;
    lastModified: string;
    calendarSynced: boolean;
    totalTasks: number;
    calendarEvents: number;
  };
}

export interface ScheduleResponse {
  _id: string;
  date: string;
  tasks: Task[];
  metadata: {
    createdAt: string;
    lastModified: string;
  };
}

export interface TimeSlot {
  start: string;
  end: string;
  isOccupied: boolean;
}

export interface ScheduleMetadata {
  totalTasks?: number;
  calendarEvents?: number;
  recurringTasks?: number;
  generatedAt: string;
  error?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date?: string };
  end: { dateTime: string; date?: string };
  recurrence?: string[]; 
}

