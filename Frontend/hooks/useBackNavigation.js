import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Custom hook for safe back navigation
 * Uses router.back() when possible, falls back to home route if needed
 */
export const useBackNavigation = () => {
  const router = useRouter();

  const goBack = useCallback((fallbackRoute = '/(tabs)/home') => {
    // Check if we can go back in the navigation stack
    if (router.canGoBack?.()) {
      router.back();
    } else {
      // If no back history, navigate to fallback route
      router.replace(fallbackRoute);
    }
  }, [router]);

  return { goBack, router };
};
