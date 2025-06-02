'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { 
  FormData, 
  FormAction, 
  FormContextType, 
  Task, 
  LayoutPreference,
  isValidSubcategoryForLayout
} from './types';

/**
 * Initial form state with sensible defaults
 */
const initialState: FormData = {
  name: "",
  age: "",
  work_start_time: "9:00 AM",
  work_end_time: "10:00 PM",
  tasks: [],
  energy_patterns: [],
  priorities: { health: "", relationships: "", fun_activities: "", ambitions: "" },
  layout_preference: {
    layout: "todolist-structured",
    subcategory: 'day-sections',
    orderingPattern: "timebox"
  },
  onboarding: {
    currentStep: 1,
    totalSteps: 6,
    isComplete: false
  }
};

/**
 * Type for values that can be set in form data fields
 */
type FormDataValue = string | string[] | Record<string, string> | Task[];

/**
 * Sets a nested property in an object using a dot-notation path
 * @param obj - Object to modify
 * @param path - Dot-notation path to the property
 * @param value - Value to set
 * @returns New object with updated property
 */
const setNestedProperty = (
  obj: FormData,
  path: string,
  value: FormDataValue
): FormData => {
  try {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      throw new Error('Invalid path provided');
    }
    
    // Create a deep clone to avoid mutations
    const result = JSON.parse(JSON.stringify(obj));
    
    // Navigate to the right nesting level
    const lastObj = keys.reduce((current: any, key: string) => {
      current[key] = current[key] || {};
      return current[key];
    }, result);
    
    // Set the value
    lastObj[lastKey] = value;
    
    return result;
  } catch (error) {
    console.error('Error in setNestedProperty:', error);
    return obj; // Return unchanged object on error
  }
};

/**
 * Extended form actions including onboarding progress management
 */
type ExtendedFormAction = FormAction | 
  { type: 'UPDATE_ONBOARDING_PROGRESS'; currentStep: number; totalSteps: number } |
  { type: 'COMPLETE_ONBOARDING' };

/**
 * Validates layout preference to ensure proper relationship between layout type and subcategory
 */
const validateLayoutPreference = (layoutPreference: Partial<LayoutPreference>): LayoutPreference => {
  // Ensure we have a valid layout
  const layout = layoutPreference.layout || initialState.layout_preference.layout;
  
  // Validate subcategory against layout type
  let subcategory = layoutPreference.subcategory || '';
  
  // Check if subcategory is valid for this layout
  if (!isValidSubcategoryForLayout(layout, subcategory)) {
    // Get defaults from layout type
    const layoutParts = layout.split('-');
    const baseLayout = layoutParts[0];
    const structure = layoutParts[1];
    
    if (structure === 'structured') {
      switch (baseLayout) {
        case 'todolist':
          subcategory = 'day-sections';
          break;
        case 'kanban':
          subcategory = 'status';
          break;
        case 'calendar':
          subcategory = 'day';
          break;
        case 'timeline':
          subcategory = 'chronological';
          break;
        default:
          subcategory = '';
      }
    } else {
      // Unstructured layouts don't need subcategories
      subcategory = '';
    }
  }
  
  // Ensure we have valid ordering pattern
  const orderingPattern = layoutPreference.orderingPattern || initialState.layout_preference.orderingPattern;
  
  return {
    layout,
    subcategory,
    orderingPattern
  };
};

/**
 * Form state reducer with enhanced type safety and proper error handling
 */
const formReducer = (state: FormData, action: ExtendedFormAction): FormData => {
  try {
    switch (action.type) {
      case 'UPDATE_FIELD': {
        // Handle special case for form updates
        if (action.field === 'formUpdate') {
          return {
            ...state,
            formUpdate: action.value,
            response: action.value.response,
            scheduleId: action.value.scheduleId
          };
        }
        
        // Handle layout_preference updates with validation
        if (action.field === 'layout_preference') {
          return {
            ...state,
            layout_preference: validateLayoutPreference(action.value as Partial<LayoutPreference>)
          };
        }
        
        // Handle regular field updates
        return setNestedProperty({...state}, action.field, action.value);
      }
      
      case 'UPDATE_NESTED_FIELD':
        return {
          ...state,
          [action.field]: {
            ...state[action.field],
            [action.subField]: action.value
          }
        };
  
      case 'UPDATE_TASK':
        return {
          ...state,
          tasks: state.tasks.map(task => 
            task.id === action.task.id ? {...task, ...action.task} : task
          )
        };
  
      case 'UPDATE_ONBOARDING_PROGRESS':
        return {
          ...state,
          onboarding: {
            ...state.onboarding,
            currentStep: action.currentStep,
            totalSteps: action.totalSteps
          }
        };
  
      case 'COMPLETE_ONBOARDING':
        return {
          ...state,
          onboarding: {
            ...state.onboarding,
            isComplete: true
          }
        };
  
      case 'RESET_FORM':
        return initialState;
  
      default:
        return state;
    }
  } catch (error) {
    console.error('Error in formReducer:', error);
    return state; // Return unchanged state on error
  }
};

/**
 * Extended form context type including onboarding state
 */
interface ExtendedFormContextType extends FormContextType {
  state: FormData & {
    onboarding?: {
      currentStep: number;
      totalSteps: number;
      isComplete: boolean;
    }
  };
  dispatch: React.Dispatch<ExtendedFormAction>;
  updateLayoutPreference: (layoutUpdates: Partial<LayoutPreference>) => void;
}

// Create context with proper typing
const FormContext = createContext<ExtendedFormContextType | undefined>(undefined);

/**
 * Form provider component that manages state for the entire form
 */
export const FormProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  /**
   * Helper to update layout preference with validation
   */
  const updateLayoutPreference = useCallback((layoutUpdates: Partial<LayoutPreference>) => {
    const updatedPreference = validateLayoutPreference({
      ...state.layout_preference,
      ...layoutUpdates
    });
    
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'layout_preference',
      value: updatedPreference
    });
  }, [state.layout_preference]);

  // Memoize context value to prevent unnecessary rerenders
  const value = React.useMemo(() => ({ 
    state, 
    dispatch,
    updateLayoutPreference
  }), [state, updateLayoutPreference]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

/**
 * Custom hook to use the form context with type safety
 * @returns The form context value
 * @throws Error if used outside FormProvider
 */
export const useForm = (): ExtendedFormContextType => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

// Export types for use in other components
export type { ExtendedFormAction, ExtendedFormContextType };