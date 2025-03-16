'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProgressBar from './ProgressBar';
import { useForm } from '@/lib/FormContext';
import { OnboardingHeader } from './OnboardingHeader';
import { useIsMobile } from '@/hooks/use-mobile';

// Define as const to ensure type safety
export const ONBOARDING_ROUTES = {
  '/personal-details': 1,
  '/work-times': 2,
  '/priorities': 3,
  '/tasks': 4,
  '/energy-patterns': 5,
  '/structure-preference': 6,
  '/subcategory-preference': 7,
  '/timebox-preference': 8,
} as const;

type OnboardingRoute = keyof typeof ONBOARDING_ROUTES;

export const OnboardingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { state, dispatch } = useForm();
  const isMobile = useIsMobile();

  // Memoize calculations to prevent unnecessary re-renders
  const totalSteps = useMemo(() => {
    const skipSubcategory = state.layout_preference?.structure === 'unstructured';
    return Object.keys(ONBOARDING_ROUTES).length - (skipSubcategory ? 1 : 0);
  }, [state.layout_preference?.structure]);

  const currentStep = useMemo(() => {
    return ONBOARDING_ROUTES[pathname as OnboardingRoute] || 0;
  }, [pathname]);

  // Update progress in context
  useEffect(() => {
    // Check if we're on a valid onboarding route
    if (!(pathname in ONBOARDING_ROUTES)) return;
    
    dispatch({
      type: 'UPDATE_ONBOARDING_PROGRESS',
      currentStep,
      totalSteps,
    });
  }, [currentStep, totalSteps, dispatch, pathname]);

  // Memoize handler to prevent recreation on each render
  const handleBack = useCallback(() => {
    const currentStepNumber = ONBOARDING_ROUTES[pathname as OnboardingRoute];
    const previousRoute = Object.entries(ONBOARDING_ROUTES)
      .find(([route]) => ONBOARDING_ROUTES[route as OnboardingRoute] === currentStepNumber - 1)?.[0];
    
    if (previousRoute) {
      router.push(previousRoute);
    }
  }, [pathname, router]);

  // Check if we're on an onboarding route
  const isOnboardingRoute = pathname in ONBOARDING_ROUTES;

  if (!isOnboardingRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Section */}
      <OnboardingHeader isMobile={isMobile} onBack={handleBack} />
      <div className="w-full">
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={totalSteps} 
        />
      </div>

      {/* Main Content */}
      <main className="flex-grow flex items-center bg-[rgb(11,11,12)]">
        <div className="w-full container mx-auto px-4 py-6">
          <div className="max-w-[800px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};