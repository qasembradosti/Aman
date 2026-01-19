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
import { loadTokenFromStorage } from "../store/slices/authSlice";
import { useEffect, useState } from "react";
import * as Font from "expo-font";
import SplashScreen from "../components/SplashScreen";
import authEvents from "../utils/authEvents";
import { logout } from "../store/slices/authSlice";

// Auth initialization component
function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await dispatch(loadTokenFromStorage()).unwrap();
      } catch (error) {
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

  // Avoid running redirects before navigation is ready, which can trigger update loops.
  const isNavigationReady = !!navigationState?.key;

  // Normalize phone verification truthiness coming from API (true/1/'1'/"true")
  const isPhoneVerified = (val) =>
    val === true || val === 1 || val === "1" || val === "true";
  // Activation requires both phone verified and active status (if status present). Treat missing user as not ready yet.
  const isActiveStatus = (val) =>
    val === "active" || val === "ACTIVATED" || val === 1;
  const needsActivation =
    isAuthenticated &&
    !!user &&
    (!isPhoneVerified(user?.phone_verified) || !isActiveStatus(user?.status));
  const rootSegment = segments?.[0];
  const leafSegment = segments?.[1];
  const inAuthGroup = rootSegment === "(auth)";
  const onVerifyPhone = inAuthGroup && leafSegment === "verify-phone";

  // Stabilize segment changes to avoid re-running the effect on every render due to array identity.
  const segmentKey = Array.isArray(segments) ? segments.join("/") : "";

  const safeReplace = (target) => {
    if (pathname !== target) {
      router.replace(target);
    }
  };

  useEffect(() => {
    if (!isNavigationReady) return;

    // 1. Not authenticated: permit staying in auth group only.
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        safeReplace("/(auth)/login");
      }
      return;
    }

    // 2. Authenticated but not activated: force verify screen.
    if (needsActivation) {
      if (!onVerifyPhone) {
        safeReplace("/(auth)/verify-phone");
      }
      return;
    }

    // 3. Active & verified: leave auth group.
    if (inAuthGroup) {
      safeReplace("/(tabs)/home");
    }
  }, [
    isNavigationReady,
    isAuthenticated,
    needsActivation,
    inAuthGroup,
    onVerifyPhone,
    pathname,
    segmentKey,
  ]);

  return children;
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          "Kurdish-Regular": require("../assets/fonts/kurdish.ttf"),
        });

        setFontsLoaded(true);
      } catch (error) {
        setFontsLoaded(true);
      } finally {
        // Add a minimum delay to show the splash screen animation
        setTimeout(() => {
          setIsAppReady(true);
        }, 3000);
      }
    }

    loadFonts();
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
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="product/[id]"
                        options={{ headerShown: false }}
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
