'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { OnboardingContent } from '@/components/parts/OnboardingContent';
import { useForm } from '@/lib/FormContext';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ProtectedRoute } from '@/components/parts/ProtectedRoute';

// Initialize dayjs plugins
dayjs.extend(customParseFormat);

/**
 * Type definition for time field names
 * Ensures type safety when handling time changes
 */
type TimeFieldName = 'work_start_time' | 'work_end_time';

const WorkTimes = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();
  
  // Create MUI theme based on system preference
  const theme = createTheme({
    palette: {
      mode: 'dark', // Force dark mode
      primary: {
        main: '#ffffff', // White for dark mode
      },
      text: {
        primary: '#ffffff',
        secondary: '#ffffff',
      },
      background: {
        paper: '#1a1a1a',
        default: '#0a0a0a',
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              color: '#ffffff',
              borderColor: '#ffffff',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.23)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#ffffff',
              },
            },
            '& .MuiInputBase-input': {
              color: '#ffffff',
            },
            '& .MuiIconButton-root': {
              color: '#ffffff',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
      MuiPopper: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
            },
            '& .MuiClock-root': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-clock': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-pin': {
              backgroundColor: '#ffffff',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: '#1a1a1a',
            '& .MuiClock-root': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-clock': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-pin': {
              backgroundColor: '#ffffff',
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
    },
  });

  /**
   * Memoized time change handler
   * Validates and formats time input before updating state
   */
  const handleTimeChange = useCallback((name: TimeFieldName) => (newValue: any, context?: any) => {
    try {
      if (newValue) {
        // Handle partial input selections
        if (dayjs.isDayjs(newValue) && context?.view === 'hours') {
          const formattedTime = newValue.format('h:mm A');
          dispatch({ type: 'UPDATE_FIELD', field: name, value: formattedTime });
        }
        // Handle complete selections
        if (dayjs.isDayjs(newValue) && newValue.isValid()) {
          const formattedTime = newValue.format('h:mm A');
          dispatch({ type: 'UPDATE_FIELD', field: name, value: formattedTime });
        }
      }
    } catch (error) {
      console.error(`Error updating ${name}:`, error);
    }
  }, [dispatch]);

  /**
   * Navigation handlers
   * Memoized to prevent unnecessary recreations
   */
  const handleNext = useCallback(() => {
    // Validate times before proceeding
    if (!state.work_start_time || !state.work_end_time) {
      console.error('Please select both start and end times');
      return;
    }

    // Validate time range
    const startTime = dayjs(`2024-01-01 ${state.work_start_time}`);
    const endTime = dayjs(`2024-01-01 ${state.work_end_time}`);
    
    if (endTime.isBefore(startTime)) {
      console.error('End time must be after start time');
      return;
    }

    console.log('Form data:', state);
    router.push('/priorities');
  }, [router, state]);

  const handlePrevious = useCallback(() => {
    router.push('/personal-details');
  }, [router]);

  return (
    <ProtectedRoute>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <OnboardingContent
            heading={<TypographyH3>Work Times</TypographyH3>}
            description={
              <TypographyP>
                Let us know your typical work hours so we can optimize your schedule.
              </TypographyP>
            }
          >
            {/* Main content wrapper */}
            <div className="space-y-6 w-full">
              {/* Time pickers container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Time Picker */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Start Time</label>
                  <TimePicker
                    value={state.work_start_time ? dayjs(`2024-01-01 ${state.work_start_time}`) : null}
                    onChange={handleTimeChange('work_start_time')}
                    views={['hours', 'minutes']}
                    ampm={true}
                    closeOnSelect={false}
                    skipDisabled={true}
                    defaultValue={null}
                    disableOpenPicker={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        placeholder: "Select start time",
                        sx: {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '& .MuiIconButton-root': {
                            color: '#ffffff',
                          },
                        },
                      },
                      field: {
                        clearable: true,
                        onClear: () => dispatch({ type: 'UPDATE_FIELD', field: 'work_start_time', value: null }),
                      },
                    }}
                  />
                </div>
    
                {/* End Time Picker */}
                <div>
                  <label className="block mb-2 text-sm font-medium">End Time</label>
                  <TimePicker
                    value={state.work_end_time ? dayjs(`2024-01-01 ${state.work_end_time}`) : null}
                    onChange={handleTimeChange('work_end_time')}
                    views={['hours', 'minutes']}
                    ampm={true}
                    closeOnSelect={false}
                    skipDisabled={true}
                    defaultValue={null}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        placeholder: "Select end time",
                        sx: {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '& .MuiIconButton-root': {
                            color: '#ffffff',
                          },
                        },
                      },
                      field: {
                        clearable: true,
                        onClear: () => dispatch({ type: 'UPDATE_FIELD', field: 'work_end_time', value: null }),
                      },
                    }}
                  />
                </div>
              </div>
    
              {/* Navigation buttons */}
              <div className="w-full flex justify-end space-x-2">
                <Button 
                  onClick={handlePrevious} 
                  variant="ghost"
                  type="button"
                >
                  Previous
                </Button>
                <Button 
                  onClick={handleNext}
                  type="button"
                  disabled={!state.work_start_time || !state.work_end_time}
                >
                  Next
                </Button>
              </div>
            </div>
          </OnboardingContent>
        </LocalizationProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
};

export default WorkTimes;