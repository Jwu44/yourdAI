'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '../../lib/FormContext';
import { BaseLayoutType, LayoutStructure } from '@/lib/types';

const StructurePreference: React.FC = () => {
  const router = useRouter();
  const { state, dispatch, updateLayoutPreference } = useForm();

  useEffect(() => {
    try {
      if (!state.layout_preference) {
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'layout_preference',
          value: {
            layout: 'todolist-structured',
            subcategory: '',
            orderingPattern: 'timebox'
          }
        });
      }
    } catch (error) {
      console.error('Error initializing layout preference:', error);
    }
  }, [state.layout_preference, dispatch]);

  const handleInputChange = useCallback((value: LayoutStructure) => {
    try {
      // Extract the base layout type from the current layout preference
      const baseLayout: BaseLayoutType = (state.layout_preference?.layout?.split('-')[0] as BaseLayoutType) || 'todolist';
      
      updateLayoutPreference({
        layout: `${baseLayout}-${value}` as const,
        subcategory: value === 'structured' ? 'day-sections' : '',
        orderingPattern: state.layout_preference?.orderingPattern || 'timebox'
      });
    } catch (error) {
      console.error('Error updating layout preference:', error);
    }
  }, [updateLayoutPreference, state.layout_preference]);

  const handleNext = useCallback(() => {
    try {
      const structure = state.layout_preference?.layout?.split('-')[1] as LayoutStructure;
      if (structure === 'structured') {
        console.log('Form data:', state);
        router.push('/subcategory-preference');
      } else {
        router.push('/task-pattern-preference');
      }
    } catch (error) {
      console.error('Error navigating to next page:', error);
    }
  }, [router, state.layout_preference]);

  const handlePrevious = useCallback(() => {
    router.push('/energy-patterns');
  }, [router]);

  // Extract structure from layout for the RadioGroup value
  const currentStructure = state.layout_preference?.layout?.split('-')[1] as LayoutStructure || '';

  return (
    <OnboardingContent
      heading={<TypographyH3>Customize Your To-Do List</TypographyH3>}
      description={
        <TypographyP>
          Let&apos;s understand your preferred daily structure.
        </TypographyP>
      }
    >
      <div className="w-full max-w-md mx-auto space-y-6">
        <RadioGroup
          value={currentStructure}
          onValueChange={handleInputChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="structured" 
              id="structured" 
              className="border-white text-white focus:ring-white"
              aria-label="Structured day preference"
            />
            <Label 
              htmlFor="structured"
              className="cursor-pointer text-white"
            >
              I prefer a structured day with clear sections
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="unstructured" 
              id="unstructured" 
              className="border-white text-white focus:ring-white"
              aria-label="Unstructured day preference"
            />
            <Label 
              htmlFor="unstructured"
              className="cursor-pointer text-white"
            >
              I like flexibility and do not want sections
            </Label>
          </div>
        </RadioGroup>

        <div className="flex justify-end space-x-2">
          <Button 
            onClick={handlePrevious} 
            variant="ghost"
            type="button"
            className="text-primary hover:text-primary"
          >
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            type="button"
            disabled={!currentStructure}
          >
            Next
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default StructurePreference;