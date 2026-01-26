import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Custom hook for optimized navigation with debouncing
 * Prevents multiple rapid navigation calls that can cause slowness
 */
export const useOptimizedNavigation = () => {
  const router = useRouter();
  const navigationInProgress = useRef(false);
  const lastNavigationTime = useRef(0);

  /**
   * Navigate with debouncing to prevent rapid successive calls
   * @param {string} route - The route to navigate to
   * @param {number} debounceMs - Debounce time in milliseconds (default: 300ms)
   */
  const navigateTo = useCallback((route, debounceMs = 300) => {
    const now = Date.now();
    
    // Prevent navigation if already in progress
    if (navigationInProgress.current) {
      return;
    }

    // Debounce rapid navigation attempts
    if (now - lastNavigationTime.current < debounceMs) {
      return;
    }

    navigationInProgress.current = true;
    lastNavigationTime.current = now;

    try {
      router.push(route);
    } finally {
      // Reset flag after a short delay
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 500);
    }
  }, [router]);

  /**
   * Navigate back with safety checks
   */
  const goBack = useCallback((fallbackRoute = '/(tabs)/home') => {
    if (navigationInProgress.current) {
      return;
    }

    navigationInProgress.current = true;
    
    try {
      if (router.canGoBack?.()) {
        router.back();
      } else {
        router.replace(fallbackRoute);
      }
    } finally {
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 500);
    }
  }, [router]);

  return { 
    navigateTo, 
    goBack,
    router 
  };
};
