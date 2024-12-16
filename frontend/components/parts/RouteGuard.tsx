'use client';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';

// Add paths that don't require authentication
const publicPaths = ['/', '/home'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRedirect = useCallback(() => {
    const url = window.location.href;
    return url.includes('auth/handler') || 
           url.includes('accounts.google.com') || 
           url.includes('code=') || 
           url.includes('state=');
  }, []);
  
  useEffect(() => {
    if (!loading) {
      const isPublicPath = publicPaths.includes(pathname);
      const inAuthFlow = isAuthRedirect();
      
      console.log("RouteGuard State:", {
        user,
        loading,
        pathname,
        isPublicPath,
        inAuthFlow,
        currentUrl: window.location.href
      });
      
      // Don't redirect if in auth flow
      if (!user && !isPublicPath && !inAuthFlow) {
        router.push('/home');
      }
    }
  }, [user, loading, pathname, router, isAuthRedirect]);
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}