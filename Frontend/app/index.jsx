import { Redirect } from "expo-router";
import { useSelector } from "react-redux";

export default function Index() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);


  const isPhoneVerified = (val) => val === true || val === 1 || val === '1' || val === 'true';
  const needsActivation = isAuthenticated && !!user && !isPhoneVerified(user?.phone_verified);
  // Redirect based on authentication and activation state
  if (!isAuthenticated) return <Redirect href="/(tabs)/home" />;
  if (needsActivation) return <Redirect href="/(auth)/verify-phone" />;
  return <Redirect href="/(tabs)/home" />;
}
