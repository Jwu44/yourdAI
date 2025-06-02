'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { Reorder, motion } from 'framer-motion';
import { ActivitySquare, Heart, Smile, Trophy } from 'lucide-react';
import { useForm } from '../../lib/FormContext';
import { Priority } from '../../lib/types';

interface PrioritiesState {
  health: string;
  relationships: string;
  fun_activities: string;
  ambitions: string;
}

/**
 * Default priorities configuration
 * Extracted to avoid recreating on each render
 */
const DEFAULT_PRIORITIES: Priority[] = [
  { id: 'health', name: 'Health', icon: ActivitySquare, color: 'text-green-500' },
  { id: 'relationships', name: 'Relationships', icon: Heart, color: 'text-red-500' },
  { id: 'fun_activities', name: 'Fun Activities', icon: Smile, color: 'text-blue-500' },
  { id: 'ambitions', name: 'Ambitions', icon: Trophy, color: 'text-yellow-500' },
];

/**
 * Draggable card component for priority items
 * Memoized to prevent unnecessary re-renders
 */
const DraggableCard: React.FC<{ item: Priority }> = React.memo(({ item }) => (
  <motion.div layout>
    <Card className="mb-4 cursor-move hover:bg-accent transition-colors max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center space-x-4 py-3">
        <item.icon className={`w-6 h-6 ${item.color}`} />
        <CardTitle className="text-lg">{item.name}</CardTitle>
      </CardHeader>
    </Card>
  </motion.div>
));

DraggableCard.displayName = 'DraggableCard';

const PriorityRanking: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  // Initialize priorities state with existing data or defaults
  const [priorities, setPriorities] = useState<Priority[]>(() => {
    try {
      if (state.priorities) {
        return DEFAULT_PRIORITIES.sort((a, b) => 
          Number((state.priorities as PrioritiesState)[a.id as keyof PrioritiesState]) - 
          Number((state.priorities as PrioritiesState)[b.id as keyof PrioritiesState])
        );
      }
    } catch (error) {
      console.error('Error initializing priorities:', error);
    }
    return DEFAULT_PRIORITIES;
  });

  /**
   * Update form context when priorities change
   * Memoized to prevent unnecessary effect triggers
   */
  useEffect(() => {
    try {
      const updatedPriorities = priorities.reduce((acc, priority, index) => {
        acc[priority.id] = (index + 1).toString();
        return acc;
      }, {} as Record<string, string>);

      dispatch({ type: 'UPDATE_FIELD', field: 'priorities', value: updatedPriorities });
    } catch (error) {
      console.error('Error updating priorities:', error);
    }
  }, [priorities, dispatch]);

  /**
   * Handlers for navigation and reordering
   * Memoized to prevent unnecessary recreations
   */
  const handleReorder = useCallback((newPriorities: Priority[]) => {
    setPriorities(newPriorities);
  }, []);

  const handleNext = useCallback(() => {
    console.log('Form data:', state);
    router.push('/tasks');
  }, [router, state]);

  const handlePrevious = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <OnboardingContent
      heading={<TypographyH3>What are your priorities outside of work?</TypographyH3>}
      description={
        <TypographyP>
          Drag to reorder the cards. The topmost card is your highest priority, 
          and the bottom is the lowest.
        </TypographyP>
      }
    >
      {/* Main content wrapper */}
      <div className="w-full space-y-6">
        {/* Draggable priority list */}
        <div className="w-full">
          <Reorder.Group
            axis="y"
            values={priorities}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {priorities.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                className="focus:outline-none"
              >
                <DraggableCard item={item} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {/* Navigation buttons */}
        <div className="w-full flex justify-end space-x-2">
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
          >
            Next
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default PriorityRanking;