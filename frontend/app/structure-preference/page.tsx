'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '../../lib/FormContext';

/**
 * Type definitions for structure preference
 */
interface LayoutPreference {
  structure: 'structured' | 'unstructured' | '';
  subcategory: string;
}

const StructurePreference: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  /**
   * Initialize layout preference if not present
   * Memoized to prevent unnecessary effect triggers
   */
  useEffect(() => {
    try {
      if (!state.layout_preference) {
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'layout_preference',
          value: {
            structure: '',
            subcategory: ''
          } as LayoutPreference
        });
      }
    } catch (error) {
      console.error('Error initializing layout preference:', error);
    }
  }, [state.layout_preference, dispatch]);

  /**
   * Handle radio input changes
   * Memoized to prevent unnecessary recreations
   */
  const handleInputChange = useCallback((value: LayoutPreference['structure']) => {
    try {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          structure: value,
          subcategory: ''
        } as LayoutPreference
      });
    } catch (error) {
      console.error('Error updating layout preference:', error);
    }
  }, [dispatch]);

  /**
   * Navigation handlers
   * Memoized to prevent unnecessary recreations
   */
  const handleNext = useCallback(() => {
    try {
      console.log('Form data:', state);
      if (state.layout_preference?.structure === 'structured') {
        router.push('/subcategory-preference');
      } else {
        router.push('/timebox-preference');
      }
    } catch (error) {
      console.error('Error navigating to next page:', error);
    }
  }, [router, state]);

  const handlePrevious = useCallback(() => {
    router.push('/energy-patterns');
  }, [router]);

  return (
    <OnboardingContent
      heading={<TypographyH3>Customize Your To-Do List</TypographyH3>}
      description={
        <TypographyP>
          Let's understand your preferred daily structure.
        </TypographyP>
      }
    >
      {/* Main content wrapper */}
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Radio group container */}
        <RadioGroup
          value={state.layout_preference?.structure || ''}
          onValueChange={handleInputChange}
          className="space-y-4"
        >
          {/* Structured option */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="structured" 
              id="structured" 
              className="border-white text-white focus:ring-white"
              aria-label="Structured day preference"
            />
            <Label 
              htmlFor="structured"
              className="cursor-pointer"
            >
              I prefer a structured day with clear sections
            </Label>
          </div>

          {/* Unstructured option */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="unstructured" 
              id="unstructured" 
              className="border-white text-white focus:ring-white"
              aria-label="Unstructured day preference"
            />
            <Label 
              htmlFor="unstructured"
              className="cursor-pointer"
            >
              I like flexibility and do not want sections
            </Label>
          </div>
        </RadioGroup>

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
            disabled={!state.layout_preference?.structure}
          >
            Next
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default StructurePreference;