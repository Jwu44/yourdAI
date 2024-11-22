'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to handle responsive media queries
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with false and update on mount to prevent hydration mismatch
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Handle server-side rendering
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Create stable listener function
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Modern API for event listener
    try {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } catch (e) {
      // Fallback for older browsers
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]); // Only re-run if query changes

  return matches;
}