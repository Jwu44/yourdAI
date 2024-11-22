'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { FormData, FormAction, FormContextType } from './types';

// Create the initial state
const initialState: FormData = {
  name: "",
  age: "",
  work_start_time: "",
  work_end_time: "",
  tasks: [],
  energy_patterns: [],
  priorities: { health: "", relationships: "", fun_activities: "", ambitions: "" },
  layout_preference: {
    structure: '',
    subcategory: '',
    timeboxed: ''
  },
  // Add onboarding progress tracking
  onboarding: {
    currentStep: 1,
    totalSteps: 8, // Default to maximum steps (including conditional pages)
    isComplete: false
  }
};

// Helper function to set nested properties
const setNestedProperty = (obj: any, path: string, value: any): any => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
  lastObj[lastKey] = value;
  return obj;
};

// Update FormAction type to include progress actions
type ExtendedFormAction = FormAction | 
  { type: 'UPDATE_ONBOARDING_PROGRESS'; currentStep: number; totalSteps: number } |
  { type: 'COMPLETE_ONBOARDING' };

// Create the reducer function with enhanced actions
const formReducer = (state: FormData, action: ExtendedFormAction): FormData => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      // Handle the special case for form updates
      if (action.field === 'formUpdate') {
        return {
          ...state,
          response: action.value.response,
          scheduleId: action.value.scheduleId
        };
      }
      // Handle regular field updates
      return setNestedProperty({...state}, action.field, action.value);
      
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
          task.id === action.task.id ? action.task : task
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
};

// Update the context type to include onboarding progress
interface ExtendedFormContextType extends FormContextType {
  state: FormData & {
    onboarding?: {
      currentStep: number;
      totalSteps: number;
      isComplete: boolean;
    }
  };
  dispatch: React.Dispatch<ExtendedFormAction>;
}

// Create the context with extended types
const FormContext = createContext<ExtendedFormContextType | undefined>(undefined);

// Create a provider component with memoization
export const FormProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  // Memoize the context value to prevent unnecessary rerenders
  const value = React.useMemo(() => ({ 
    state, 
    dispatch 
  }), [state]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

// Create a custom hook to use the form context with type safety
export const useForm = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

// Export types for use in other components
export type { ExtendedFormAction, ExtendedFormContextType };