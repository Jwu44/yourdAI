'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '../../lib/FormContext';
import { useToast } from "@/hooks/use-toast";
import { generateSchedule } from '@/lib/ScheduleHelper';
import { ClockIcon, Layers, Repeat, ArrowUpDown, Database } from 'lucide-react';
import { TaskOrderingPattern } from '../../lib/types'

interface TaskPatternOption {
  value: TaskOrderingPattern;
  label: string;
  description: string;
  icon: React.ElementType;
}

const TaskPatternPreference: React.FC = () => {
  const { state, dispatch } = useForm();
  const router = useRouter();
  const { toast } = useToast();
  
  const taskPatternOptions: TaskPatternOption[] = [
    { 
      value: 'timebox', 
      label: 'Timeboxed', 
      description: 'Tasks with specific time allocations',
      icon: ClockIcon 
    },
    { 
      value: 'untimebox', 
      label: 'Untimeboxed', 
      description: 'Flexible timing for tasks',
      icon: Layers 
    },
    { 
      value: 'batching', 
      label: 'Batching', 
      description: 'Group similar tasks together',
      icon: Database 
    },
    { 
      value: 'alternating', 
      label: 'Alternating', 
      description: 'Switch between different types of tasks',
      icon: ArrowUpDown 
    },
    { 
      value: 'three-three-three', 
      label: '3-3-3', 
      description: 'Three tasks in three categories in three time blocks',
      icon: Repeat 
    },
  ];

  // Initialize ordering pattern if it doesn't exist
  useEffect(() => {
    try {
      if (!state.layout_preference?.orderingPattern) {
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'layout_preference',
          value: {
            ...state.layout_preference,
            orderingPattern: 'timebox'
          }
        });
      }
    } catch (error) {
      console.error('Error initializing task pattern preference:', error);
    }
  }, [state.layout_preference, dispatch]);

  // Get the form context at the component level
  const { updateLayoutPreference } = useForm();
  
  // Handle pattern selection
  const handlePatternChange = useCallback((value: TaskOrderingPattern) => {
    try {
      // Use the updateLayoutPreference helper which validates the entire layout preference
      updateLayoutPreference({
        orderingPattern: value
      });
    } catch (error) {
      console.error('Error updating task pattern preference:', error);
    }
  }, [updateLayoutPreference]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const result = await generateSchedule(state);
      
      if (!result.scheduleId) {
        throw new Error('Invalid response from server');
      }

      // Correctly structure the response to match what dashboard expects
      dispatch({ 
        type: 'UPDATE_FIELD', 
        field: 'formUpdate',
        value: {
          response: {
            tasks: result.tasks,
            layout_type: result.layout,
            ordering_pattern: result.orderingPattern
          },
          scheduleId: result.scheduleId
        }
      });
      console.log("FormUpdate dispatched to context:", {
        hasResponse: !!result,
        responseStructure: {
          hasTasks: Array.isArray(result.tasks),
          tasksLength: Array.isArray(result.tasks) ? result.tasks.length : 0,
          scheduleId: result.scheduleId
        }
      });
      toast({
        title: "Success",
        description: "Schedule generated successfully",
      });

      router.push('/dashboard');
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Navigation handler
  const handlePrevious = () => {
    if (state.layout_preference?.layout?.includes('structured')) {
      router.push('/subcategory-preference');
    } else {
      router.push('/structure-preference');
    }
  };

  return (
    <OnboardingContent
      heading={<TypographyH3>Task Pattern Preference</TypographyH3>}
      description={
        <TypographyP>
          Choose how you&apos;d like your tasks to be organized
        </TypographyP>
      }
    >
      {/* Main content wrapper */}
      <div className="space-y-6 w-full">
        {/* Instructions */}
        <TypographyP className="text-left">
          Select one task pattern:
        </TypographyP>

        {/* Task pattern options grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {taskPatternOptions.map((option) => (
            <div
              key={option.value}
              className="bg-white dark:bg-secondary p-4 rounded-lg flex flex-col items-center text-center h-full"
            >
              <div className="flex flex-col items-center justify-between h-full">
                <div className="h-20 flex items-center justify-center">
                  <option.icon className="w-8 h-8 text-black dark:text-white" />
                </div>
                <p className="text-sm font-medium mb-2 leading-tight text-black dark:text-white">
                  {option.label}
                </p>
                <p className="text-xs mb-3 leading-tight flex-grow text-gray-600 dark:text-gray-300">
                  {option.description}
                </p>
                <Checkbox
                  checked={state.layout_preference?.orderingPattern === option.value}
                  onCheckedChange={() => handlePatternChange(option.value)}
                  aria-label={option.label}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="w-full flex justify-end space-x-2">
          <Button 
            onClick={handlePrevious} 
            variant="ghost" 
            className="text-primary hover:text-primary"
          >
            Previous
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!state.layout_preference?.orderingPattern}
          >
            Generate Schedule
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default TaskPatternPreference;