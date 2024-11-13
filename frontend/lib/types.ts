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
}

export interface FormData {
  name: string;
  age: string;
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