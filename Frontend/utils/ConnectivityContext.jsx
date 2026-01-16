import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import OfflineSplash from "../components/OfflineSplash";
import { setIsConnected as setSharedIsConnected } from "./connectivityState";

const ConnectivityContext = createContext({
  isConnected: true,
  checking: false,
  checkNow: async () => {},
});

export function useConnectivity() {
  return useContext(ConnectivityContext);
}

export function ConnectivityProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [checking, setChecking] = useState(true);

  const updateState = useCallback((val) => {
    setIsConnected(val);
    try {
      setSharedIsConnected(val);
    } catch (e) {}
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialCheck() {
      setChecking(true);
      try {
        const state = await NetInfo.fetch();
        if (!mounted) return;
        // NetInfo gives both isConnected and isInternetReachable on some platforms.
        const online = !!(
          state.isConnected &&
          (state.isInternetReachable ?? true)
        );
        updateState(online);
      } catch (e) {
        // If NetInfo fails for any reason, assume offline until proven otherwise
        updateState(false);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    initialCheck();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(
        state.isConnected &&
        (state.isInternetReachable ?? true)
      );
      updateState(online);
    });

    return () => {
      mounted = false;
      try {
        unsubscribe();
      } catch (e) {}
    };
  }, [updateState]);

  // manual reachability test (useful for user-triggered retry)
  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      // Quick HTTP probe to a lightweight URL that returns 204
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch("https://clients3.google.com/generate_204", {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const ok = resp && (resp.status === 204 || resp.ok);
      updateState(!!ok);
      return ok;
    } catch (e) {
      updateState(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, [updateState]);

  // Show a full page splash when checking or offline
  const showSplash = checking || !isConnected;

  return (
    <ConnectivityContext.Provider value={{ isConnected, checking, checkNow }}>
      {showSplash ? (
        <OfflineSplash checking={checking} onRetry={checkNow} />
      ) : (
        children
      )}
    </ConnectivityContext.Provider>
  );
}

export default ConnectivityContext;
