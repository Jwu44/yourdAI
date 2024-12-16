import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  connectAuthEmulator,
  signOut as firebaseSignOut 
} from 'firebase/auth';

import { CalendarCredentials } from './types';

// Your existing Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Connect to emulator if in development
// if (process.env.NODE_ENV === 'development') {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   console.log('Connected to Auth Emulator');
// }
// ;

const getRedirectUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8001';
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
};

// Configure Google Auth Provider with Calendar scopes
const googleProvider = new GoogleAuthProvider();

// Enhanced RedirectResult interface with more specific types
interface RedirectResult {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    getIdToken: (forceRefresh: boolean) => Promise<string>;
  };
  credentials: CalendarCredentials;
  hasCalendarAccess: boolean;
  scopes: string[];  // Changed from string to string[] for better typing
}

// Add required Google Calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');        // Read calendar events
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly'); // Read event details
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly'); // Read list of calendars
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Optional: Add settings scope if you want to manage calendar settings
// googleProvider.addScope('https://www.googleapis.com/auth/calendar.settings.readonly');

// Configure sign in with custom parameters
// Let Firebase handle the redirect URI internally
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline',
  redirect_uri: getRedirectUrl() // Add this line
});

// Enhanced sign in function with better error handling and logging
export const signInWithGoogle = async () => {
  try {
    // Clear any existing auth states and tokens
    sessionStorage.clear();
    await firebaseSignOut(auth).catch(() => {}); // Silent cleanup

    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      throw new Error('Firebase configuration is missing');
    }

    console.log("Auth domain check:", {
      configuredDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      currentUrl: window.location.href,
      authDomain: auth.config.authDomain
    });

    // Initiate the redirect sign-in
    await signInWithRedirect(auth, googleProvider);
    console.log({auth});
    console.log({googleProvider});
    console.log("i'm gey")
    return true;
  } catch (error: any) {
    console.error('Google sign-in error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Enhanced error handling with specific error types
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked. Please allow popups and try again.');
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in was cancelled.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

// Enhanced redirect result handler with better type safety and error handling
export const handleRedirectResult = async (): Promise<RedirectResult | null> => {
  try {
    console.log("Getting redirect result...");
    
    const result = await getRedirectResult(auth);
    console.log("Raw redirect result:", result ? "exists" : "null");
    
    if (!result) {
      console.log("No redirect result - user hasn't completed sign-in");
      return null;
    }

    // Get Google OAuth access token from the credential
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential) {
      throw new Error('No credential received from Google');
    }

    const accessToken = credential.accessToken;
    
    if (!accessToken) {
      throw new Error('No access token received from Google');
    }

    // Get and validate scopes granted by the user
    const grantedScopes = ((credential as any)?.scope as string) || '';
    const scopesArray = grantedScopes.split(' ').filter(Boolean); // Remove empty strings
    
    // Validate required scopes
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
    ];
    
    const hasRequiredScopes = requiredScopes.every(scope => 
      scopesArray.includes(scope)
    );

    if (!hasRequiredScopes) {
      console.warn('Missing required calendar scopes:', {
        required: requiredScopes,
        granted: scopesArray
      });
    }

    console.log("Auth successful:", {
      uid: result.user.uid,
      email: result.user.email,
      hasToken: Boolean(accessToken),
      scopes: scopesArray,
      hasRequiredScopes
    });

    // Return the authentication result with necessary information
    return { 
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        getIdToken: (forceRefresh: boolean) => result.user.getIdToken(forceRefresh)
      },
      credentials: {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000, // Token expires in 1 hour
        scopes: scopesArray
      },
      hasCalendarAccess: hasRequiredScopes,
      scopes: scopesArray
    };

  } catch (error: any) {
    console.error('Redirect result error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    // Enhanced error handling with specific error types
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('This Google account is already linked to another user.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in is not enabled. Please contact support.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('The sign-in credential is invalid. Please try again.');
    }

    throw error;
  }
};

// Enhanced sign out function with better error handling
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Clear any stored tokens or state
    sessionStorage.clear();
  } catch (error: any) {
    console.error('Sign out error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw new Error('Failed to sign out. Please try again.');
  }
};

// Export auth and app instances for use in other parts of the application
export { auth, app };