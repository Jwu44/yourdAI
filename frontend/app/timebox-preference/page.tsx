'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '../../lib/FormContext';
import { useToast } from "@/hooks/use-toast";
import { submitFormData, extractSchedule } from '@/lib/helper';

/**
 * Type definitions for timebox preference
 */
type TimeboxType = 'timeboxed' | 'untimeboxed' | '';

interface LayoutPreferenceState {
  structure: string;
  subcategory?: string;
  timeboxed: TimeboxType;
}

const TimeboxPreference: React.FC = () => {
  const { state, dispatch } = useForm();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Initialize layout preference if it doesn't exist
   * Memoized to prevent unnecessary effect triggers
   */
  useEffect(() => {
    try {
      if (!state.layout_preference?.timeboxed) {
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'layout_preference',
          value: {
            ...state.layout_preference,
            timeboxed: 'timeboxed'
          } as LayoutPreferenceState
        });
      }
    } catch (error) {
      console.error('Error initializing timebox preference:', error);
    }
  }, [state.layout_preference, dispatch]);

  /**
   * Handle radio input changes
   * Memoized to prevent unnecessary recreations
   */
  const handleInputChange = useCallback((value: TimeboxType) => {
    try {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          ...state.layout_preference,
          timeboxed: value
        } as LayoutPreferenceState
      });
    } catch (error) {
      console.error('Error updating timebox preference:', error);
    }
  }, [dispatch, state.layout_preference]);

  /**
   * Handle form submission
   * Includes error handling and loading states
   */
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await submitFormData(state);
      
      const scheduleContent = extractSchedule(result);
      
      if (!scheduleContent || !result.scheduleId) {
        throw new Error('Invalid response from server');
      }

      dispatch({ 
        type: 'UPDATE_FIELD', 
        field: 'formUpdate',
        value: {
          response: scheduleContent,
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
    } finally {
      setIsLoading(false);
    }
  }, [state, dispatch, toast, router]);

  /**
   * Navigation handler
   * Memoized to prevent unnecessary recreations
   */
  const handlePrevious = useCallback(() => {
    if (state.layout_preference?.structure === 'structured') {
      router.push('/subcategory-preference');
    } else {
      router.push('/structure-preference');
    }
  }, [router, state.layout_preference?.structure]);

  return (
    <OnboardingContent
      heading={<TypographyH3>Task Timeboxing Preference</TypographyH3>}
      description={
        <TypographyP>
          Would you like your tasks to be timeboxed?
        </TypographyP>
      }
    >
      {/* Main content wrapper */}
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Radio group container */}
        <RadioGroup
          value={state.layout_preference?.timeboxed || ''}
          onValueChange={handleInputChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="timeboxed" 
              id="timeboxed" 
              className="border-white text-white focus:ring-white"
              aria-label="Enable timeboxed tasks"
            />
            <Label 
              htmlFor="timeboxed"
              className="cursor-pointer"
            >
              Yes, I want timeboxed tasks
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="untimeboxed" 
              id="untimeboxed" 
              className="border-white text-white focus:ring-white"
              aria-label="Disable timeboxed tasks"
            />
            <Label 
              htmlFor="untimeboxed"
              className="cursor-pointer"
            >
              No, I prefer flexible timing
            </Label>
          </div>
        </RadioGroup>

        {/* Navigation buttons */}
        <div className="flex justify-end space-x-2">
          <Button 
            onClick={handlePrevious} 
            variant="ghost"
            type="button"
            disabled={isLoading}
          >
            Previous
          </Button>
          <Button 
            onClick={handleSubmit}
            type="button"
            disabled={!state.layout_preference?.timeboxed || isLoading}
          >
            {isLoading ? 'Generating Schedule...' : 'Generate Schedule'}
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default TimeboxPreference;