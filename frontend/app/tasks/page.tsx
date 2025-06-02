'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import TaskItem from '@/components/parts/TaskItem';
import { handleAddTask, handleUpdateTask, handleDeleteTask } from '@/lib/helper';
import { useForm } from '../../lib/FormContext';
import { Task } from '../../lib/types';
import { OnboardingContent } from '@/components/parts/OnboardingContent';

const Tasks: React.FC = () => {
  const router = useRouter();
  const [newTask, setNewTask] = useState('');
  const { toast } = useToast();
  const { state, dispatch } = useForm();

  // Ensure tasks is always an array
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];

  /**
   * Initialize tasks array if not present
   */
  useEffect(() => {
    if (!Array.isArray(state.tasks)) {
      dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: [] });
    }
  }, [state.tasks, dispatch]);

  /**
   * Memoized task handlers to prevent unnecessary recreations
   */
  const addTask = useCallback(async () => {
    if (!newTask.trim()) return;

    try {
      const updatedTasks = await handleAddTask(state.tasks, newTask, []);
      dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
      setNewTask('');
      toast({
        title: "Success",
        description: "Task added successfully.",
      });
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  }, [newTask, state.tasks, dispatch, toast]);

  const updateTask = useCallback((updatedTask: Task) => {
    try {
      const updatedTasks = handleUpdateTask(state.tasks, updatedTask);
      dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
      toast({
        title: "Success",
        description: "Task updated successfully.",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  }, [state.tasks, dispatch, toast]);

  const deleteTask = useCallback((taskId: string) => {
    try {
      const updatedTasks = handleDeleteTask(state.tasks, taskId);
      dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  }, [state.tasks, dispatch, toast]);

  const handleKeyPress = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addTask();
    }
  }, [addTask]);

  const handleNext = useCallback(() => {
    console.log('Form data:', state);
    router.push('/energy-patterns');
  }, [router, state]);

  const handlePrevious = useCallback(() => {
    router.push('/priorities');
  }, [router]);

  return (
    <OnboardingContent
      heading={<TypographyH3>What tasks do you have today?</TypographyH3>}
      description={
        <TypographyP>
          There are 5 categories of task: Exercise, Relationships, Fun, Ambition and Work. 
          You can assign multiple categories to each task.
        </TypographyP>
      }
    >
      {/* Main content wrapper */}
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Tasks list */}
        <div className="space-y-2">
          {tasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
          
          {/* New task input */}
          <div className="flex items-center w-full">
            <Input
              placeholder="+ New task"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={addTask}
              maxLength={100} // Prevent extremely long tasks
              aria-label="Add new task"
            />
          </div>
        </div>

        {/* Navigation buttons */}
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
          >
            Next
          </Button>
        </div>
      </div>
    </OnboardingContent>
  );
};

export default Tasks;