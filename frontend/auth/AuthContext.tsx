'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, UserCredential } from 'firebase/auth';
import { auth, provider } from './firebase';
import { signInWithPopup, getRedirectResult } from 'firebase/auth';
import { AuthContextType, CalendarCredentials } from '@/lib/types';
import { calendarApi } from '@/lib/api/calendar';

/**
 * Auth Context for managing user authentication state
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook to access auth context
 * @returns The current auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process calendar access and connect to Google Calendar
   * @param credential Google Auth credential
   */
  // Inside the processCalendarAccess function of AuthContext.tsx, modify the calendar connection code:

  const processCalendarAccess = async (credential: any): Promise<void> => {
    try {
      // Get scopes and check for calendar access
      const scopes = await getScopes(credential.accessToken);
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      );
      
      console.log("Has calendar access:", hasCalendarAccess);
      
      if (hasCalendarAccess) {
        try {
          // Ensure user is fully authenticated before proceeding
          // This forces a small delay to ensure Firebase auth state is fully established
          console.log("Waiting for auth state to stabilize before connecting to Google Calendar...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Create credentials object
          console.log("Connecting to Google Calendar...");
          const credentials: CalendarCredentials = {
            accessToken: credential.accessToken,
            expiresAt: Date.now() + 3600000, // 1 hour expiry as a fallback
            scopes: scopes
          };
          
          // Connect to calendar with retry mechanism
          await calendarApi.connectCalendar(credentials);
          console.log("Connected to Google Calendar");
          
          // Fetch events for current day - only attempt if connection succeeded
          const today = new Date().toISOString().split('T')[0];
          await calendarApi.fetchEvents(today);
        } catch (calendarError) {
          console.error("Error connecting to calendar:", calendarError);
          // Continue to dashboard even if calendar connection fails
        }
      }
      
      // Navigate to dashboard
      console.log("Navigating to dashboard");
      window.location.href = '/dashboard';
    } catch (error) {
      console.error("Error processing calendar access:", error);
      window.location.href = '/dashboard';
    }
  };

  /**
   * Store user information in the backend
   * @param user Firebase user object
   */
  const storeUserInBackend = async (user: User): Promise<void> => {
    try {
      // Get the token
      const idToken = await user.getIdToken();
      console.log("Got ID token");
      
      // Check if NEXT_PUBLIC_API_URL is set correctly
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://yourdai.be';
      console.log("API Base URL from env:", apiBaseUrl);
      
      // Now try the user endpoint
      const apiUrl = `${apiBaseUrl}/api/auth/user`;
      console.log("Attempting to store user at:", apiUrl);
      
      // Create a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error("Request to user endpoint timed out after 20 seconds");
        controller.abort();
      }, 20000);
      
      // Try to store the user
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            googleId: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            hasCalendarAccess: true
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log("User endpoint status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error storing user:', errorText);
          return;
        }
        
        const data = await response.json();
        console.log("User stored successfully:", data);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error storing user (non-blocking):", error);
        console.log("Continuing without server-side user storage");
      }
    } catch (error) {
      console.error("Authentication process error:", error);
    }
  };

  // Handle Firebase auth state changes
  useEffect(() => {
    console.log("Setting up auth state change listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user ? `${user.displayName} (${user.email})` : "null");
      
      // Set user state immediately to prevent UI blocking
      setUser(user);
      setLoading(false);
      
      if (user) {
        await storeUserInBackend(user);
        console.log("Authentication completed successfully");
      }
    });
  
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  // Handle redirect result and check for calendar access
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log("Checking redirect result...");
        const result = await getRedirectResult(auth);
        console.log("Redirect result:", result);
        
        if (result) {
          // User successfully signed in after redirect
          console.log("Redirect sign-in successful");
        
          // Get credentials from result.credential
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (!credential || !credential.accessToken) {
            console.error("Missing credential or access token");
            window.location.href = '/dashboard';
            return;
          }
          
          await processCalendarAccess(credential);
        } else {
          console.log("No redirect result found");
        }
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        setError('Failed to sign in with Google');
        window.location.href = '/dashboard';
      }
    };
    
    handleRedirectResult();
  }, []);

  /**
   * Sign in with Google and request calendar access
   * @param redirectTo Destination after successful sign-in
   */
  const signIn = async (redirectTo = '/dashboard') => {
    try {
      setError(null);
      console.log("Starting sign in process, redirect destination:", redirectTo);
      
      // Store the intended destination to access after authentication completes
      localStorage.setItem('authRedirectDestination', redirectTo);
      console.log("Stored redirect destination in localStorage");
      
      // Configure provider to request calendar access and force consent screen
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      provider.setCustomParameters({
        prompt: 'consent'  // Force the consent screen to appear
      });
      
      console.log("Initiating signInWithPopup");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful:", result.user ? `${result.user.displayName} (${result.user.email})` : "No user");
      
      // Get credentials from result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        await processCalendarAccess(credential);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Google');
      window.location.href = '/dashboard';
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Note: User state will be automatically set to null by onAuthStateChanged
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,                // Add this to satisfy AuthState
    currentUser: user,   // This is your renamed property
    loading,
    error,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Get scopes associated with an access token
 * @param accessToken Google OAuth access token
 * @returns Array of scope strings
 */
const getScopes = async (accessToken: string): Promise<string[]> => {
  try {
    // This endpoint will return the scopes associated with the token
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.scope ? data.scope.split(' ') : [];
  } catch (error) {
    console.error('Error getting token scopes:', error);
    return [];
  }
};