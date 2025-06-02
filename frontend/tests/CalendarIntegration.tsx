import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/app/dashboard/page';
import { AuthProvider } from '@/auth/AuthContext';
import { FormProvider } from '@/lib/FormContext';
import { calendarApi } from '@/lib/api/calendar';

// Mock calendar API
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: jest.fn()
  }
}));

// Mock auth context
jest.mock('@/auth/AuthContext', () => ({
  ...jest.requireActual('@/auth/AuthContext'),
  useAuth: () => ({
    currentUser: { uid: 'test-user-id' },
    loading: false,
    error: null
  })
}));

describe('Calendar Integration in Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    
    // Render dashboard with providers
    render(
      <AuthProvider>
        <FormProvider>
          <Dashboard />
        </FormProvider>
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(calendarApi.fetchEvents).toHaveBeenCalled();
    });
  });
});