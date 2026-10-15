import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/figtree";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router/stack";
import { DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ApiError } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SavedProvider } from "@/lib/saved";
import { colors, fonts } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't hammer the API on 4xx (rate limits, not found); retry network blips once.
      retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

// The design is light-only.
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.accent, background: colors.groupedBackground, card: colors.cell, text: colors.label, border: colors.border },
};

const modal = { presentation: "modal", headerShown: true };
// Log in / Sign up are the whole app while signed out, so they're full screens, not modals.
const authScreen = { headerShown: false, animation: "fade", contentStyle: { backgroundColor: colors.cell } };

export default function RootLayout() {
  const [loaded, error] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold });

  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SavedProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="dark" />
            <RootStack />
          </ThemeProvider>
        </SavedProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// The API only serves listings to logged-in users, so everything except the account
// screens sits behind sign-in. Signing in or out switches stacks automatically.
function RootStack() {
  const { status } = useAuth();
  const signedIn = status === "signedIn";

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // Keep the splash screen up while saved tokens are checked.
  if (status === "loading") return null;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: colors.cell },
        headerTitleStyle: { color: colors.label, fontFamily: fonts["700"], fontSize: 16 },
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="review-editor" options={{ ...modal, title: "Write a Review" }} />
        <Stack.Screen name="claim/[id]" options={{ ...modal, title: "Claim Company" }} />
        <Stack.Screen name="edit-profile" options={{ ...modal, title: "Account Information" }} />
        <Stack.Screen name="edit-company/[id]" options={{ ...modal, title: "Edit Listing" }} />
        <Stack.Screen name="address-editor" options={{ ...modal, title: "Address" }} />
        <Stack.Screen name="reply/[id]" options={{ ...modal, title: "Reply" }} />
        <Stack.Screen name="change-password" options={{ ...modal, title: "Change Password" }} />
        <Stack.Screen name="change-email" options={{ ...modal, title: "Change Email" }} />
        <Stack.Screen name="delete-account" options={{ ...modal, title: "Delete Account" }} />
        <Stack.Screen
          name="photos"
          options={{ presentation: "fullScreenModal", headerShown: false, animation: "fade", contentStyle: { backgroundColor: "#000" } }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={authScreen} />
        <Stack.Screen name="signup" options={authScreen} />
        <Stack.Screen name="forgot-password" options={{ ...modal, title: "Reset Password" }} />
      </Stack.Protected>
      {/* Opened from the reset email, whether or not this device is signed in. */}
      <Stack.Screen name="reset-password/[uid]/[token]" options={{ ...modal, title: "New Password" }} />
    </Stack>
  );
}
