'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  loadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin" />
    </div>
  )
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      console.log('User not authenticated, redirecting to home');
      router.push('/home');
    }
  }, [user, loading, router]);

  if (loading) {
    return <>{loadingComponent}</>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}