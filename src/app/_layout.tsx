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
import { AuthProvider } from "@/lib/auth";
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

const modal = { presentation: "modal" as const, headerShown: true };
const bare = { presentation: "modal" as const, headerShown: false, contentStyle: { backgroundColor: colors.cell } };

export default function RootLayout() {
  const [loaded, error] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SavedProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerTintColor: colors.accent,
                headerBackButtonDisplayMode: "minimal",
                headerStyle: { backgroundColor: colors.cell },
                headerTitleStyle: { color: colors.label, fontFamily: fonts["700"], fontSize: 16 },
                contentStyle: { backgroundColor: colors.groupedBackground },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={bare} />
              <Stack.Screen name="signup" options={bare} />
              <Stack.Screen name="forgot-password" options={{ ...modal, title: "Reset Password" }} />
              <Stack.Screen name="reset-password/[uid]/[token]" options={{ ...modal, title: "New Password" }} />
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
            </Stack>
          </ThemeProvider>
        </SavedProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
