"use client"; 
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, signInWithGoogle, signOut, handleRedirectResult } from '@/lib/firebase';
import { tokenService } from './tokenService';
import { calendarApi } from './calendarApi';
import { 
  AuthContextType, 
  AuthState,  
  AuthResponse
} from '@/lib/types';

const API_BASE_URL = 'http://localhost:8000/api';

// Update interface to include calendar-specific state
interface CalendarAuthState {
  connected: boolean;
  syncStatus: 'never' | 'in_progress' | 'completed' | 'failed';
  lastSyncTime: string | null;
  selectedCalendars: string[];
}

// Extended context type to include calendar state
interface ExtendedAuthContextType extends AuthContextType {
  calendarState: CalendarAuthState;
  connectCalendar: (selectedCalendars: string[]) => Promise<void>;  // Updated signature
  disconnectCalendar: () => Promise<void>;
  refreshCalendarToken: () => Promise<void>;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  
  // Add calendar-specific state
  const [calendarState, setCalendarState] = useState<CalendarAuthState>({
    connected: false,
    syncStatus: 'never',
    lastSyncTime: null,
    selectedCalendars: []
  });

  const router = useRouter();
  const processed = React.useRef(false);

  // Single source of truth for authentication flow
  useEffect(() => {
    const handleRedirectAuth = async () => {
      try {
        if (processed.current) return;
        processed.current = true;

        console.log("Checking for redirect authentication...");
        console.log("Current URL:", window.location.href);
        const redirectResult = await handleRedirectResult();
        console.log("Redirect result:", redirectResult); // Add this
        
        if (redirectResult) {
          console.log("Processing redirect result");
          // Store calendar tokens if available
          if (redirectResult.credentials) {
            await tokenService.storeCalendarTokens(
              redirectResult.user.uid,
              redirectResult.credentials
            );
          }
          
          // Create/update user in database
          await syncUserWithDatabase(
            redirectResult.user,
            redirectResult.hasCalendarAccess
          );
          
          // Navigate to work-times page
          router.push('/work-times');
        }
      } catch (error) {
        console.error('Redirect handling error:', error);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        }));
      }
    };

    // Check for redirect result on mount
    handleRedirectAuth();

    return () => {
      processed.current = false;
    };
  }, [router]);

  // Firebase auth state listener - remains separate to handle ongoing auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log("Firebase auth state changed - user signed in:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email
          });
          
          // Only sync with database if not handling redirect
          await syncUserWithDatabase(firebaseUser);
        } else {
          console.log("Firebase auth state changed - user signed out");
          setAuthState({
            user: null,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Enhanced syncUserWithDatabase function
  const syncUserWithDatabase = async (
    firebaseUser: {
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      getIdToken: (forceRefresh: boolean) => Promise<string>;
    },
    hasCalendarAccess: boolean = false
  ): Promise<void> => {
      try {
          const token = await firebaseUser.getIdToken(true);
          sessionStorage.setItem('authToken', token);

          // First sync the user
          const response = await fetch(`${API_BASE_URL}/auth/user`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  googleId: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
                  photoURL: firebaseUser.photoURL || '',
                  hasCalendarAccess
              })
          });

          if (!response.ok) {
              throw new Error(`Failed to sync user with database: ${response.statusText}`);
          }

          const userData: AuthResponse = await response.json();

          // Check if user has any schedules
          const schedulesResponse = await fetch(`${API_BASE_URL}/user/${firebaseUser.uid}/has-schedules`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });

          if (!schedulesResponse.ok) {
              throw new Error('Failed to check user schedules');
          }

          const { hasSchedules } = await schedulesResponse.json();

          setAuthState({
              user: userData.user,
              loading: false,
              error: null
          });
          console.log(hasSchedules)
          // Redirect based on schedule existence
          if (!hasSchedules) {
              router.push('/work-times');
          } else {
              router.push('/dashboard');
          }

          if (hasCalendarAccess) {
              setCalendarState(prev => ({
                  ...prev,
                  connected: true,
                  syncStatus: 'completed',
                  lastSyncTime: new Date().toISOString()
              }));
          }
      } catch (error) {
          console.error('Database sync error:', error);
          throw new Error(
              error instanceof Error 
                  ? `Failed to sync user: ${error.message}`
                  : 'Failed to sync user with database'
          );
      }
  };

  // Enhanced sign-in handler with better error handling
  const handleSignIn = async () => {
    try {
      console.log("Starting sign-in process...");
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Clear any existing auth state
      await signOut();
      
      // Initiate Google sign-in
      console.log("Initiating Google sign-in...");
      await signInWithGoogle();
      
    } catch (error) {
      console.error('Sign-in error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error 
          ? error.message 
          : 'Failed to sign in'
      }));
      
      // Re-throw error for component handling
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Call Firebase sign out
      await signOut();
        
      // Clear ALL storage
      sessionStorage.clear();
      localStorage.clear(); // Add this to clear Firebase auth persistence
      
      // Call Firebase sign out
      await signOut();
      
      // Clear auth state
      setAuthState({
        user: null,
        loading: false,
        error: null
      });
      
      // Clear session storage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userId');
      
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign out'
      }));
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const connectCalendar = async (selectedCalendars: string[]) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      if (!authState.user?.googleId) {
        throw new Error('User not authenticated');
      }

      // First verify permissions
      const token = await tokenService.getValidAccessToken(authState.user.googleId);
      if (!token) {
        throw new Error('No valid calendar token');
      }

      const permissionsResult = await calendarApi.verifyCalendarPermissions(token);
      
      if (!permissionsResult.hasPermissions) {
        throw new Error('Calendar permissions not granted');
      }

      // Connect calendar with selected calendars
      const result = await calendarApi.connectCalendar(
        authState.user.googleId,
        selectedCalendars
      );

      setCalendarState({
        connected: true,
        syncStatus: result.status,
        lastSyncTime: new Date().toISOString(),
        selectedCalendars
      });

    } catch (error) {
      console.error('Calendar connection error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect calendar'
      }));
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const disconnectCalendar = async () => {
    try {
      if (!authState.user?.googleId) return;
      
      await calendarApi.disconnectCalendar(authState.user.googleId);
      await tokenService.clearTokens(authState.user.googleId);
      
      setCalendarState({
        connected: false,
        syncStatus: 'never',
        lastSyncTime: null,
        selectedCalendars: []
      });
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect calendar'
      }));
    }
  };
  // Add calendar token refresh interval
  useEffect(() => {
    if (!authState.user?.googleId) return;

    const refreshInterval = setInterval(async () => {
      try {
        if (await tokenService.needsRefresh(authState.user!.googleId)) {
          await refreshCalendarToken();
        }
      } catch (error) {
        console.error('Calendar token refresh error:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [authState.user]);

  // Add calendar status polling
  useEffect(() => {
    if (!authState.user?.googleId || !calendarState.connected) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await calendarApi.getCalendarStatus(authState.user!.googleId);
        setCalendarState(prev => ({
          ...prev,
          ...status
        }));
      } catch (error) {
        console.error('Calendar status check error:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [authState.user?.googleId, calendarState.connected]);


  const refreshCalendarToken = async () => {
    try {
      if (!authState.user?.googleId) return;
      const newToken = await tokenService.getValidAccessToken(authState.user.googleId);
      if (!newToken) {
        throw new Error('Failed to refresh calendar token');
      }
      // Token is automatically stored by the token service
    } catch (error) {
      console.error('Token refresh error:', error);
      // On critical token errors, disconnect calendar
      await disconnectCalendar();
    }
  };

  const value: ExtendedAuthContextType = {
    ...authState,
    signIn: handleSignIn,
    signOut: handleSignOut,
    clearError: () => setAuthState(prev => ({ ...prev, error: null })),
    calendarState,
    connectCalendar,
    disconnectCalendar,
    refreshCalendarToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Updated hook to include calendar functionality
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}