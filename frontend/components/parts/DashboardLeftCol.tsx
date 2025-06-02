import React, { useCallback} from 'react';
import { TypographyH3, TypographyH4 } from '@/app/fonts/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import { Card, CardHeader } from '@/components/ui/card';
import TaskItem from './TaskItem';
import { Task, Priority } from '../../lib/types';
import { ActivitySquare, Heart, Smile, Trophy } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useForm } from '../../lib/FormContext';

interface DashboardLeftColProps {
  newTask: string;
  setNewTask: (task: string) => void;
  priorities: Priority[];
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addTask: () => void;
  handleReorder: (newPriorities: Priority[]) => void;
  submitForm: () => void;
  handleEnergyChange: (value: string) => void;
  isLoading: boolean;
}

const DraggableCard: React.FC<{ item: Priority }> = ({ item }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'health':
        return <ActivitySquare className="w-4 h-4 text-green-500" />;
      case 'relationships':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'fun_activities':
        return <Smile className="w-4 h-4 text-blue-500" />;
      case 'ambitions':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <motion.div layout>
      <Card className="mb-4 cursor-move bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center space-x-4 py-2">
          {getIcon(item.id)}
          <p className="text-white text-sm">{item.name}</p>
        </CardHeader>
      </Card>
    </motion.div>
  );
};

const DashboardLeftCol: React.FC<DashboardLeftColProps> = ({
  newTask,
  setNewTask,
  priorities,
  updateTask,
  deleteTask,
  addTask,
  handleReorder,
  submitForm,
  handleEnergyChange,
  isLoading
}) => {
  const { state, dispatch } = useForm();

  const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'UPDATE_FIELD', field: name, value });
  };

  const handleNestedChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const [category, subCategory] = name.split('.');
    dispatch({ 
      type: 'UPDATE_NESTED_FIELD', 
      field: category,
      subField: subCategory,
      value 
    });
  }, [dispatch]);

  const energyOptions = [
    { value: 'high_all_day', label: 'High-Full of energy during the day', icon: Flower },
    { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
    { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
    { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
    { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
  ];

  const energyPatterns = state.energy_patterns || [];

  return (
    <div className="h-full w-full p-6 bg-gray-900 overflow-y-auto text-white">
      <TypographyH3 className="mb-6">Edit Inputs</TypographyH3>
      <div className="space-y-6">
        <div>
          <Label htmlFor="work_start_time">Work Start Time</Label>
          <Input
            id="work_start_time"
            name="work_start_time"
            value={state.work_start_time}
            onChange={handleSimpleChange}
            placeholder="Enter your work start time"
            className="bg-gray-800 text-white border-gray-700"
          />
        </div>
        <div>
          <Label htmlFor="work_end_time">Work End Time</Label>
          <Input
            id="work_end_time"
            name="work_end_time"
            value={state.work_end_time}
            onChange={handleSimpleChange}
            placeholder="Enter your work end time"
            className="bg-gray-800 text-white border-gray-700"
          />
        </div>

        <div>
          <TypographyH4 className="mb-2">Tasks</TypographyH4>
          {state.tasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
          <Input
            placeholder="Add new task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTask.trim()) {
                addTask();
              }
            }}
            className="mt-2 bg-gray-800 text-white border-gray-700"
          />
          <Button 
            onClick={() => {
              if (newTask.trim()) {
                addTask();
              }
            }} 
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Task
          </Button>
        </div>

        <div>
          <TypographyH4 className="mb-2">Priorities (Drag to reorder)</TypographyH4>
          <Reorder.Group axis="y" values={priorities} onReorder={handleReorder}>
            {priorities.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <DraggableCard item={item} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div>
          <TypographyH4 className="mb-2">Energy Patterns</TypographyH4>
          {energyOptions.map((option) => (
            <div key={option.value} className="flex items-center mb-2">
              <Checkbox
                id={option.value}
                checked={energyPatterns.includes(option.value)}
                onCheckedChange={() => handleEnergyChange(option.value)}
                className="mr-2 border-white"
              />
              <Label htmlFor={option.value} className="flex items-center">
                <option.icon className="w-4 h-4 mr-2" />
                <span>{option.label}</span>
              </Label>
            </div>
          ))}
        </div>

        <div>
          <TypographyH4 className="mb-2">Layout Preferences</TypographyH4>
          {/* Structure */}
          <div className="mb-4">
            <Label className="mb-2 block font-bold">Structure</Label>
            <RadioGroup
              value={state.layout_preference.layout.startsWith('todolist-structured') ? 'structured' : 'unstructured'}
              onValueChange={(value) => handleNestedChange({
                target: { 
                  name: 'layout_preference.layout', 
                  value: value === 'structured' ? 'todolist-structured' : 'todolist-unstructured' 
                }
              } as React.ChangeEvent<HTMLInputElement>)}
              className="space-y-2"
            >
              <div className="flex items-center">
                <RadioGroupItem 
                  value="structured" 
                  id="structured" 
                  className={cn(
                    "border-white",
                    "before:bg-white before:shadow-white",
                    "data-[state=checked]:border-white data-[state=checked]:bg-white"
                  )}
                />
                <Label htmlFor="structured" className="ml-2">Structured day with clear sections</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem 
                  value="unstructured" 
                  id="unstructured" 
                  className={cn(
                    "border-white",
                    "before:bg-white before:shadow-white",
                    "data-[state=checked]:border-white data-[state=checked]:bg-white"
                  )}
                />
                <Label htmlFor="unstructured" className="ml-2">Flexible day without sections</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Subcategory */}
          {state.layout_preference.layout === 'todolist-structured' && (
            <div className="mb-4">
              <Label htmlFor="layout_subcategory" className="mb-2 block font-bold">Subcategory</Label>
              <Select
                value={state.layout_preference.subcategory || ''}
                onValueChange={(value) => handleNestedChange({
                  target: { name: 'layout_preference.subcategory', value }
                } as React.ChangeEvent<HTMLSelectElement>)}
              >
                <SelectTrigger id="layout_subcategory" className="bg-gray-800 text-white border-gray-700">
                  <SelectValue placeholder="Select a layout type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700">
                  <SelectItem value="day-sections">Day Sections (Morning, Afternoon, Evening)</SelectItem>
                  <SelectItem value="priority">Priority (High, Medium, Low)</SelectItem>
                  <SelectItem value="category">Category Based (Work, Fun, Relationships, Ambition, Exercise)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task Pattern */}
          <div className="mb-4">
            <Label className="mb-2 block font-bold">Task Pattern</Label>
            <Select
              value={state.layout_preference.orderingPattern || ''}
              onValueChange={(value) => handleNestedChange({
                target: { name: 'layout_preference.orderingPattern', value }
              } as React.ChangeEvent<HTMLSelectElement>)}
            >
              <SelectTrigger id="task_pattern" className="bg-gray-800 text-white border-gray-700">
                <SelectValue placeholder="Select a task pattern" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                <SelectItem value="timebox">Timeboxed</SelectItem>
                <SelectItem value="untimebox">Untimeboxed</SelectItem>
                <SelectItem value="batching">Batching</SelectItem>
                <SelectItem value="alternating">Alternating</SelectItem>
                <SelectItem value="three-three-three">3-3-3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={submitForm} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
          disabled={isLoading}
        >
          {isLoading ? 'Updating...' : 'Update Schedule'}
        </Button>
      </div>
    </div>
  );
};

export default DashboardLeftCol;