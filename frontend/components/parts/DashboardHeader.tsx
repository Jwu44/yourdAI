import React, { useState, useEffect, useCallback } from 'react';
import { format as dateFormat } from 'date-fns';
import { Loader2, Sparkles, User, CalendarIcon, CreditCard, Settings, LogOut, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateToString, checkScheduleExists } from '@/lib/helper';

// Custom Components
import { TypographyH3 } from '@/app/fonts/text';
import DashboardLeftCol from './DashboardLeftCol';

// Types
import { FormData, Priority, Task } from '@/lib/types';

interface DashboardHeaderProps {
    currentDayIndex: number;
    selectedDate: Date | undefined;
    isLoadingSuggestions: boolean;
    isCalendarDrawerOpen: boolean;  // Updated prop name
    isDropdownOpen: boolean;
    state: FormData;
    onRequestSuggestions: () => Promise<void>;
    onCalendarDrawerOpenChange: (open: boolean) => void;  // Updated prop name
    onDropdownOpenChange: (open: boolean) => void;
    onDateSelect: (date: Date | undefined) => Promise<void>;
    onSubmitForm: () => Promise<void>;
    isLoading: boolean;
    onNextDay: () => Promise<void>;
    onPreviousDay: () => void;
    currentDate: Date | undefined;
    dashboardLeftColProps:  {
    newTask: string;
    setNewTask: (task: string) => void;
    priorities: Priority[];
    updateTask: (task: Task) => void;
    deleteTask: (taskId: string) => void;
    addTask: () => void;
    handleReorder: (newPriorities: Priority[]) => void;
    handleEnergyChange: (value: string) => void;
  };
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    currentDayIndex,
    selectedDate,
    isLoadingSuggestions,
    isCalendarDrawerOpen,     // Updated from isDrawerOpen
    isDropdownOpen,
    state,
    onRequestSuggestions,
    onCalendarDrawerOpenChange,  // Updated from onDrawerOpenChange
    onDropdownOpenChange,
    onDateSelect,
    onSubmitForm,
    isLoading,
    onNextDay,
    onPreviousDay,
    currentDate,
    dashboardLeftColProps
  }) => {
    // State to track button disabled states
  const [isPrevDisabled, setIsPrevDisabled] = useState(true);
  const [isNextDisabled, setIsNextDisabled] = useState(false);

  // Memoize the date formatting to prevent unnecessary recalculations
  const formattedDate = useCallback(() => {
    try {
      if (!currentDate) return 'Invalid Date';
      return dateFormat(currentDate, 'EEEE, MMMM d');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, [currentDate]);

  // Memoized function to check if previous day is available
  const isPreviousDayAvailable = useCallback(async (): Promise<boolean> => {
    if (!currentDate) return false;
    
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if yesterday's schedule exists using helper function
    return await checkScheduleExists(yesterday);
  }, [currentDate]);

  // Memoized function to check if next day is available
  const isNextDayAvailable = useCallback(async (): Promise<boolean> => {
    if (!currentDate) return false;
    
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Allow navigation to next day if it's tomorrow (can generate new schedule)
    const actualTomorrow = new Date();
    actualTomorrow.setDate(actualTomorrow.getDate() + 1);
    
    if (tomorrow.toDateString() === actualTomorrow.toDateString()) {
      return true;
    }
    
    // Check if next day's schedule exists using helper function
    return await checkScheduleExists(tomorrow);
  }, [currentDate]);

  // Effect to update button states
  useEffect(() => {
    const updateNavigationStates = async () => {
      const [prevAvailable, nextAvailable] = await Promise.all([
        isPreviousDayAvailable(),
        isNextDayAvailable()
      ]);
      
      setIsPrevDisabled(!prevAvailable);
      setIsNextDisabled(!nextAvailable);
    };

    updateNavigationStates();
  }, [currentDate, isPreviousDayAvailable, isNextDayAvailable]);

  return (
    <div className="flex justify-between items-center mb-6">
      {/* Left section: Title with navigation and AI Suggestions */}
      <div className="flex items-center gap-4">
        {/* Date display with navigation chevrons */}
        <div className="flex items-center gap-2">
          {/* AI suggestions button - Positioned before the date */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRequestSuggestions}
            disabled={isLoadingSuggestions}
            className="h-9 w-9"
            aria-label="Request AI Suggestions"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </Button>
  
          <TypographyH3 className="text-white">
            {formattedDate()}
          </TypographyH3>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPreviousDay()}
                disabled={isPrevDisabled}
                className={`h-9 w-9 transition-opacity ${
                  isPrevDisabled ? 'opacity-50' : 'opacity-100 hover:opacity-80'
                }`}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNextDay()}
                disabled={isNextDisabled}
                className={`h-9 w-9 transition-opacity ${
                  isNextDisabled ? 'opacity-50' : 'opacity-100 hover:opacity-80'
                }`}
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
          </div>
        </div>
      </div>
  
      {/* Right section: Profile Dropdown */}
      <div className="flex items-center space-x-4">
        {/* Profile Dropdown */}
        <DropdownMenu 
          open={isDropdownOpen} 
          onOpenChange={onDropdownOpenChange}
        >
          {/* Avatar Trigger */}
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage 
                src="/avatar-placeholder.png" 
                alt="User avatar"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
  
          <DropdownMenuContent
            className="w-56 bg-[#1c1c1c] text-white border-gray-700"
            align="end"
            alignOffset={-5}
            sideOffset={5}
          >
            <DropdownMenuLabel className="font-normal">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            
            {/* Profile Menu Items */}
            <DropdownMenuItem className="focus:bg-gray-700">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
  
            {/* Edit Schedule Sheet Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <DropdownMenuItem
                  className="focus:bg-gray-700"
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Edit schedule</span>
                </DropdownMenuItem>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[400px] sm:w-[540px] p-0"
              >
                <DashboardLeftCol
                  {...state}
                  {...dashboardLeftColProps}
                  submitForm={onSubmitForm}
                  isLoading={isLoading}
                />
              </SheetContent>
            </Sheet>
  
            {/* Calendar Menu Item - Separated from Drawer */}
            <DropdownMenuItem
              className="focus:bg-gray-700"
              onSelect={(event) => {
                event.preventDefault();
                onCalendarDrawerOpenChange(true);
                onDropdownOpenChange(false);
              }}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>Schedules</span>
            </DropdownMenuItem>
  
            {/* Additional Menu Items */}
            <DropdownMenuItem className="focus:bg-gray-700">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem className="focus:bg-gray-700">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
  
        {/* Separate Calendar Drawer */}
        <Drawer 
          open={isCalendarDrawerOpen} 
          onOpenChange={onCalendarDrawerOpenChange}
        >
          <DrawerContent className="bg-[#1c1c1c] text-white border-t border-gray-700">
            <div className="flex justify-center items-center min-h-[20vh] py-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateSelect}
                initialFocus
                className="mx-auto"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                  IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default React.memo(DashboardHeader);