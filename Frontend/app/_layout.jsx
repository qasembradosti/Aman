import {
  Stack,
  useRouter,
  useSegments,
  usePathname,
  useRootNavigationState,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "../utils/LanguageContext";
import { ThemeProvider } from "../utils/ThemeContext";
import { ConnectivityProvider } from "../utils/ConnectivityContext";
import { NotificationSocketProvider } from "../utils/NotificationSocketProvider";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "../store/store";
import { useEffect, useState, useMemo, useCallback } from "react";
import * as Font from "expo-font";
import SplashScreen from "../components/SplashScreen";
import { authEvents } from "../utils/authEvents";
import { loadTokenFromStorage, logout } from "../store/slices/authSlice";

const PUBLIC_TAB_ROUTES = new Set(["home", "search", "rank"]);
const PUBLIC_TOP_LEVEL_ROUTES = new Set([
  "products",
  "product",
  "brands",
  "brand",
  "categories",
  "category",
  "about",
  "help-support",
]);

const isPublicGuestRoute = (segments = []) => {
  const [rootSegment, leafSegment] = segments || [];

  if (!rootSegment) {
    return true;
  }

  if (rootSegment === "(auth)") {
    return true;
  }

  if (rootSegment === "(tabs)") {
    return PUBLIC_TAB_ROUTES.has(leafSegment);
  }

  return PUBLIC_TOP_LEVEL_ROUTES.has(rootSegment);
};

// Auth initialization component
function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await dispatch(loadTokenFromStorage()).unwrap();
      } catch {
        // console.log("ℹ️ No token found or token invalid");
      } finally {
        setAuthLoaded(true);
      }
    };

    initAuth();
  }, [dispatch]);

  // Subscribe to auth events (e.g., token expiration) and dispatch logout
  useEffect(() => {
    const unsubscribe = authEvents.on(async (event, payload) => {
      if (event === "logout") {
        try {
          await dispatch(logout()).unwrap();
        } catch {}
      }
    });
    return unsubscribe;
  }, [dispatch]);

  // Don't render children until auth is loaded
  if (!authLoaded) {
    return null;
  }

  return children;
}

// Route guard component using expo-router segments
function AuthGate({ children }) {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);

  const isNavigationReady = !!navigationState?.key;

  // Normalize phone verification truthiness coming from API (true/1/'1'/"true")
  const isPhoneVerified = useCallback(
    (val) => val === true || val === 1 || val === "1" || val === "true",
    [],
  );
  // Activation requires both phone verified and active status (if status present). Treat missing user as not ready yet.
  const isActiveStatus = useCallback(
    (val) => val === "active" || val === "ACTIVATED" || val === 1,
    [],
  );

  const needsActivation = useMemo(
    () =>
      isAuthenticated &&
      !!user &&
      (!isPhoneVerified(user?.phone_verified) || !isActiveStatus(user?.status)),
    [isAuthenticated, user, isPhoneVerified, isActiveStatus],
  );

  const rootSegment = segments?.[0];
  const leafSegment = segments?.[1];
  const inAuthGroup = rootSegment === "(auth)";
  const onVerifyPhone = inAuthGroup && leafSegment === "verify-phone";

  const isGuestRouteAllowed = useMemo(
    () => isPublicGuestRoute(segments),
    [segments],
  );
  const shouldRedirectGuestToLogin = !isAuthenticated && !isGuestRouteAllowed;
  const shouldRedirectToVerify = isAuthenticated && needsActivation && !onVerifyPhone;
  const shouldRedirectAuthenticatedAwayFromAuth =
    isAuthenticated && !needsActivation && inAuthGroup;

  const safeReplace = useCallback(
    (target) => {
      if (pathname !== target) {
        router.replace(target);
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    if (!isNavigationReady) return;

    // 1. Not authenticated: allow public browsing only.
    if (shouldRedirectGuestToLogin) {
      safeReplace("/(auth)/login");
      return;
    }

    // 2. Authenticated but not activated: force verify screen.
    if (shouldRedirectToVerify) {
      safeReplace("/(auth)/verify-phone");
      return;
    }

    // 3. Active & verified: leave auth group.
    if (shouldRedirectAuthenticatedAwayFromAuth) {
      safeReplace("/(tabs)/home");
    }
  }, [
    isNavigationReady,
    shouldRedirectGuestToLogin,
    shouldRedirectToVerify,
    shouldRedirectAuthenticatedAwayFromAuth,
    safeReplace,
  ]);

  if (
    !isNavigationReady ||
    shouldRedirectGuestToLogin ||
    shouldRedirectToVerify ||
    shouldRedirectAuthenticatedAwayFromAuth
  ) {
    return null;
  }

  return children;
}

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadFonts() {
      try {
        await Font.loadAsync({
          "Kurdish-Regular": require("../assets/fonts/kurdish.ttf"),
        });
      } catch {
      } finally {
        if (mounted) {
          setIsAppReady(true);
        }
      }
    }

    loadFonts();

    return () => {
      mounted = false;
    };
  }, []);

  // Show splash screen while fonts are loading and minimum time hasn't passed
  if (!isAppReady) {
    return <SplashScreen />;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ConnectivityProvider>
              <AuthInitializer>
                <NotificationSocketProvider>
                  <AuthGate>
                    <StatusBar style="auto" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: "default",
                        gestureEnabled: true,
                        gestureDirection: "horizontal",
                      }}
                    >
                      <Stack.Screen
                        name="(auth)"
                        options={{
                          headerShown: false,
                          animation: "fade",
                        }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{
                          headerShown: false,
                          animation: "fade",
                        }}
                      />
                      <Stack.Screen
                        name="product/[id]"
                        options={{
                          headerShown: false,
                          presentation: "card",
                          gestureEnabled: true,
                        }}
                      />
                      <Stack.Screen
                        name="withdraw"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="categories"
                        options={{ headerShown: false }}
                      />
                      {/* Added About screen so /about route matches */}
                      <Stack.Screen
                        name="about"
                        options={{ headerShown: false }}
                      />
                    </Stack>
                  </AuthGate>
                </NotificationSocketProvider>
              </AuthInitializer>
            </ConnectivityProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
