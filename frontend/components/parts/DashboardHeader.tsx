import React, { useCallback } from 'react';
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

// Custom Components
import { TypographyH3 } from '@/app/fonts/text';
import DashboardLeftCol from './DashboardLeftCol';

// Types
import { FormData, Priority, Task } from '@/lib/types';

interface DashboardHeaderProps {
    currentDayIndex: number;
    selectedDate: Date | undefined;
    isLoadingSuggestions: boolean;
    isDrawerOpen: boolean;
    isDropdownOpen: boolean;
    state: FormData;
    onRequestSuggestions: () => Promise<void>;
    onDrawerOpenChange: (open: boolean) => void;
    onDropdownOpenChange: (open: boolean) => void;
    onDateSelect: (date: Date | undefined) => Promise<void>;
    onSubmitForm: () => Promise<void>;
    isLoading: boolean;
    dashboardLeftColProps: {
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
  isDrawerOpen,
  isDropdownOpen,
  state,
  onRequestSuggestions,
  onDrawerOpenChange,
  onDropdownOpenChange,
  onDateSelect,
  onSubmitForm,
  isLoading,
  dashboardLeftColProps
}) => {
  // Memoize the date formatting to prevent unnecessary recalculations
  const formattedDate = useCallback(() => {
    try {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + currentDayIndex);
      const displayDate = selectedDate || currentDate;
      return dateFormat(displayDate, 'EEEE, MMMM d');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, [currentDayIndex, selectedDate]);

  // Handle dropdown item selection with error boundary
  const handleDropdownSelect = useCallback((event: Event) => {
    try {
      event.preventDefault();
      onDrawerOpenChange(true);
    } catch (error) {
      console.error('Error handling dropdown selection:', error);
    }
  }, [onDrawerOpenChange]);

  return (
    <div className="flex justify-between items-center mb-6">
      {/* Left section: Title and AI Suggestions */}
      <div className="flex items-center gap-4">
        <TypographyH3 className="text-white">
          {formattedDate()}
        </TypographyH3>
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
      </div>

     {/* Right section: Profile Dropdown */}
    <div className="flex items-center space-x-4">
      <DropdownMenu 
        open={isDropdownOpen} 
        onOpenChange={onDropdownOpenChange}
      >
        <DropdownMenuTrigger asChild>
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage 
              src="/avatar-placeholder.png" 
              alt="User avatar"
              onError={(e) => {
                // Fallback to AvatarFallback on image load error
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
                  // Prevent the default dropdown close behavior
                  event.preventDefault();
                  // Stop event from bubbling up to parent elements
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

          {/* Calendar Drawer Trigger */}
          <Drawer open={isDrawerOpen} onOpenChange={onDrawerOpenChange}>
            <DrawerTrigger asChild>
              <DropdownMenuItem
                className="focus:bg-gray-700"
                onSelect={handleDropdownSelect}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>Schedules</span>
              </DropdownMenuItem>
            </DrawerTrigger>
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

            {/* Additional Menu Items */}
            <DropdownMenuItem className="focus:bg-gray-700">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Subscription</span>
            </DropdownMenuItem>
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
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(DashboardHeader);