'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingContentProps {
  children: React.ReactNode;
  heading: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

/**
 * Standardized content wrapper for onboarding pages
 * Handles consistent spacing and layout for all onboarding content
 */
export const OnboardingContent = ({
  children,
  heading,
  description,
  className,
}: OnboardingContentProps) => {
  return (
    <div className={cn('flex flex-col items-center w-full', className)}>
      {/* Heading Section */}
      <div className="text-center mb-6 space-y-2">
        <div className="mb-2">{heading}</div>
        {description && (
          <div className="text-muted-foreground max-w-[500px]">
            {description}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="w-full">{children}</div>
    </div>
  );
};