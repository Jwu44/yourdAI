'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '../../lib/FormContext';

/**
 * Type definitions for subcategory preference
 */
type SubcategoryType = 'day-sections' | 'priority' | 'category' | '';

interface LayoutPreferenceState {
  structure: string;
  subcategory: SubcategoryType;
}

/**
 * Available subcategory options
 * Extracted to avoid recreation on each render
 */
const SUBCATEGORY_OPTIONS = [
  { value: 'day-sections', label: 'Day Sections (Morning, Afternoon, Evening)' },
  { value: 'priority', label: 'Priority (High, Medium, Low)' },
  { value: 'category', label: 'Category Based (Work, Fun, Relationships, Ambition, Exercise)' },
] as const;

const SubcategoryPreference: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  /**
   * Handle select input changes
   * Memoized to prevent unnecessary recreations
   */
  const handleInputChange = useCallback((value: SubcategoryType) => {
    try {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          ...state.layout_preference,
          subcategory: value
        } as LayoutPreferenceState
      });
    } catch (error) {
      console.error('Error updating subcategory preference:', error);
    }
  }, [dispatch, state.layout_preference]);

  /**
   * Navigation handlers
   * Memoized to prevent unnecessary recreations
   */
  const handleNext = useCallback(() => {
    try {
      if (!state.layout_preference?.subcategory) {
        console.error('No subcategory selected');
        return;
      }
      console.log('Form data:', state);
      router.push('/timebox-preference');
    } catch (error) {
      console.error('Error navigating to next page:', error);
    }
  }, [router, state]);

  const handlePrevious = useCallback(() => {
    router.push('/structure-preference');
  }, [router]);

  return (
    <OnboardingContent
      heading={<TypographyH3>Choose Your Structured Layout</TypographyH3>}
      description={
        <TypographyP>
          Select the type of structure you prefer for your day.
        </TypographyP>
      }
    >
      {/* Main content wrapper */}
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Select input container */}
        <div className="w-full">
          <Select
            value={state.layout_preference?.subcategory || ''}
            onValueChange={handleInputChange}
          >
            <SelectTrigger 
              className="w-full"
              aria-label="Select layout type"
            >
              <SelectValue placeholder="Select a layout type" />
            </SelectTrigger>
            <SelectContent>
              {SUBCATEGORY_OPTIONS.map(option => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-end space-x-2">
          <Button 
            onClick={handlePrevious} 
            variant="ghost"
            type="button"
          >
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            type="button"
            disabled={!state.layout_preference?.subcategory}
          >
            Next
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default SubcategoryPreference;