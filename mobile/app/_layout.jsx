import { Slot } from "expo-router";
import SafeScreen from "@/components/SafeScreen";
import { ClerkProvider } from "@clerk/clerk-expo";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";

const tokenCache = {
  getToken: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error("SecureStore getToken error:", err);
      return null;
    }
  },
  saveToken: async (key, value) => {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("SecureStore saveToken error:", err);
    }
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <SafeScreen>
        <Slot />
      </SafeScreen>
      <StatusBar style="dark" />
    </ClerkProvider>
  );
}
