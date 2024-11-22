'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '@/lib/FormContext';

interface PersonalFormFields {
  name: string;
  age: string;
}

const PersonalDetails: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  /**
   * Handle input changes with type safety
   * Memoized to prevent unnecessary re-renders
   */
  const handleInputChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    
    // Validate age input
    if (name === 'age') {
      const ageNum = parseInt(value);
      if (value && (isNaN(ageNum) || ageNum < 0 || ageNum > 120)) {
        return; // Invalid age
      }
    }

    dispatch({ type: 'UPDATE_FIELD', field: name as keyof PersonalFormFields, value });
  }, [dispatch]);

  /**
   * Handle form submission
   * Validates required fields before proceeding
   */
  const handleNext = useCallback(() => {
    // Basic validation
    if (!state.name?.trim()) {
      // You might want to add proper form validation/error handling here
      console.error('Name is required');
      return;
    }

    console.log('Form data:', state);
    router.push('/work-times');
  }, [state, router]);

  return (
    <OnboardingContent
      heading={<TypographyH3>Personal Details</TypographyH3>}
      description={
        <TypographyP>
          Help us personalize your experience by sharing a few details about yourself.
        </TypographyP>
      }
    >
      {/* Form Fields Container */}
      <div className="space-y-6 w-full">
        {/* Input Fields */}
        <div className="space-y-4">
          <Input
            name="name"
            value={state.name ?? ''} // Fallback for undefined
            onChange={handleInputChange}
            placeholder="Name"
            aria-label="Your name"
            required
            maxLength={50} // Reasonable max length
          />
          <Input
            name="age"
            type="number"
            value={state.age ?? ''} // Fallback for undefined
            onChange={handleInputChange}
            placeholder="Age"
            aria-label="Your age"
            min={0}
            max={120}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-end">
          <Button 
            onClick={handleNext}
            disabled={!state.name?.trim()} // Disable if name is empty
            aria-label="Continue to next step"
          >
            Next
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default PersonalDetails;