import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentStep, 
  totalSteps,
  className 
}) => {
  // Use state to animate progress changes
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Calculate and animate progress
    const targetProgress = Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);
    
    // Animate to new progress value
    setProgress(targetProgress);
  }, [currentStep, totalSteps]);

  return (
    <div className={cn("w-full", className)}>
      <Progress 
        value={progress} 
        className="w-full h-2]" // Background for remaining progress
        progressClassName="bg-blue-500" // Color for completed progress
      />
    </div>
  );
};

export default ProgressBar;