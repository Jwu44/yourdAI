import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { calendarApi } from '@/lib/calendarApi';

interface Calendar {
  id: string;
  summary: string;
  primary: boolean;
}

export function CalendarConnection() {
  const { authState, calendarState, connectCalendar, disconnectCalendar } = useAuth();
  const [availableCalendars, setAvailableCalendars] = useState<Calendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAvailableCalendars() {
      try {
        setLoading(true);
        const token = await tokenService.getValidAccessToken(authState.user!.googleId);
        if (!token) return;

        const result = await calendarApi.verifyCalendarPermissions(token);
        setAvailableCalendars(result.availableCalendars);
        
        // Auto-select primary calendar
        const primaryCalendar = result.availableCalendars.find(cal => cal.primary);
        if (primaryCalendar) {
          setSelectedCalendars([primaryCalendar.id]);
        }
      } catch (error) {
        console.error('Error fetching calendars:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch calendars');
      } finally {
        setLoading(false);
      }
    }

    if (authState.user && !calendarState.connected) {
      fetchAvailableCalendars();
    }
  }, [authState.user, calendarState.connected]);

  const handleCalendarSelect = (calendarId: string) => {
    setSelectedCalendars(prev => 
      prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const handleConnect = async () => {
    try {
      setError(null);
      await connectCalendar(selectedCalendars);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect calendar');
    }
  };

  if (!authState.user) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Calendar Connection
      </h2>
      
      {calendarState.connected ? (
        <div>
          <div className="mb-4">
            <span className="text-green-600">✓</span> Calendar Connected
            <p className="text-sm text-gray-600">
              Last synced: {calendarState.lastSyncTime 
                ? new Date(calendarState.lastSyncTime).toLocaleString() 
                : 'Never'}
            </p>
          </div>
          <button
            onClick={disconnectCalendar}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Disconnect Calendar
          </button>
        </div>
      ) : (
        <div>
          {loading ? (
            <div>Loading calendars...</div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Select calendars to sync:</h3>
                {availableCalendars.map(calendar => (
                  <label key={calendar.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedCalendars.includes(calendar.id)}
                      onChange={() => handleCalendarSelect(calendar.id)}
                      className="mr-2"
                    />
                    {calendar.summary}
                    {calendar.primary && (
                      <span className="ml-2 text-sm text-gray-600">(Primary)</span>
                    )}
                  </label>
                ))}
              </div>
              
              <button
                onClick={handleConnect}
                disabled={selectedCalendars.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Connect Calendar
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}