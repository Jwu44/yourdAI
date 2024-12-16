import { NextRequest, NextResponse } from 'next/server';
import { auth } from './firebaseAdmin';
import { cookies } from 'next/headers';

// Your Python backend URL
const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';

// Helper function to send requests to Python backend
async function fetchFromPythonBackend(endpoint: string, options: RequestInit) {
  const response = await fetch(`${PYTHON_BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch from Python backend');
  }

  return response.json();
}

// Verify Firebase token and get user data
async function verifyAuthAndGetUser(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    return { token, decodedToken }; // Return both token and decoded data
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify the Firebase token and get user data
    const { token, decodedToken } = await verifyAuthAndGetUser(request);
    const userData = await request.json();

    // Validate required fields
    if (!userData.googleId || !userData.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user document
    const userDoc = {
      googleId: userData.googleId,
      email: userData.email,
      displayName: userData.displayName || '',
      photoURL: userData.photoURL || '',
      role: 'free',
      calendarSynced: false,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Send user data to Python backend
    const pythonResponse = await fetchFromPythonBackend('/submit_data', {
      method: 'POST',
      body: JSON.stringify({
        name: userDoc.displayName,
        googleId: userDoc.googleId,
        email: userDoc.email,
        role: userDoc.role
      })
    });

    // Store the session token in an HTTP-only cookie
    const sessionCookie = await auth.createSessionCookie(token, {
      expiresIn: 60 * 60 * 24 * 14 * 1000 // 14 days
    });

    cookies().set('session', sessionCookie, {
      maxAge: 60 * 60 * 24 * 14, // 14 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    // Combine backend response with user document
    const combinedUserData = {
      ...userDoc,
      ...pythonResponse,
      isNewUser: pythonResponse.isNewUser || true // Flag to determine if this is a new user
    };

    return NextResponse.json({
      message: 'User synced successfully',
      user: combinedUserData,
    });

  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync user data' },
      { status: 500 }
    );
  }
}

// Get user data from both Firebase and Python backend
export async function GET(request: NextRequest) {
  try {
    const { decodedToken, token } = await verifyAuthAndGetUser(request);
    
    // Get user data from Python backend
    const pythonResponse = await fetchFromPythonBackend(`/user/${decodedToken.uid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Combine Firebase and Python backend data
    const userData = {
      ...pythonResponse.user,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    return NextResponse.json({ user: userData });

  } catch (error) {
    console.error('Get user error:', error);
    if (error instanceof Error && error.message === 'No token provided') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}

// Sign out
export async function DELETE(request: NextRequest) {
  try {
    // Clear the session cookie
    cookies().delete('session');

    return NextResponse.json({ 
      message: 'Signed out successfully' 
    });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}

// Update user data
export async function PUT(request: NextRequest) {
  try {
    const { decodedToken, token } = await verifyAuthAndGetUser(request);
    const updates = await request.json();

    // Send updates to Python backend
    const pythonResponse = await fetchFromPythonBackend(`/user/${decodedToken.uid}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: pythonResponse.user
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
}