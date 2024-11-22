'use client';

import { usePathname } from 'next/navigation';
import { ONBOARDING_ROUTES } from './OnboardingLayout';
import { ArrowLeft } from 'lucide-react';
import { memo } from 'react';

interface OnboardingHeaderProps {
  isMobile: boolean;
  onBack?: () => void;
}

/**
 * Header component for onboarding flow
 * Memoized to prevent unnecessary re-renders
 */
export const OnboardingHeader = memo(function OnboardingHeader({ 
  isMobile, 
  onBack 
}: OnboardingHeaderProps) {
  const pathname = usePathname();
  
  // Safely type check the route
  const isFirstStep = ONBOARDING_ROUTES[pathname as keyof typeof ONBOARDING_ROUTES] === 1;

  // Early return for invalid routes to prevent unnecessary rendering
  if (!pathname || !(pathname in ONBOARDING_ROUTES)) {
    return null;
  }

  return (
    <header className="bg-[rgb(14,17,19)] w-full border-b border-[#343536]">
      <div className="container mx-auto px-4 h-14 flex items-center justify-center relative">
        {isMobile && !isFirstStep && onBack && (
          <button 
            onClick={onBack}
            className="absolute left-4 text-gray-200 hover:bg-[#272729] rounded-full p-1 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="text-gray-200 text-lg font-medium select-none">
          Yourdai
        </span>
      </div>
    </header>
  );
});