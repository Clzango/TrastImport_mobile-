import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/text";
import { Banner, Button, Loading } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

/**
 * Where WeChat (and other OAuth providers) send the browser back after sign-in on web, with
 * ?code=…&state=… On native, the in-app browser session catches this URL instead.
 */
export default function AuthCallbackScreen() {
  const { code, state, error: providerError } = useLocalSearchParams();
  const { completeProviderSignIn } = useAuth();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (process.env.EXPO_OS !== "web") return;
    if (typeof code !== "string" || typeof state !== "string") {
      setError(providerError ? "The sign-in was cancelled." : "The sign-in didn't return a code. Try again.");
      return;
    }
    completeProviderSignIn(code, state).then(
      () => router.replace("/"),
      (e) => setError(errorMessage(e)),
    );
  }, [code, state, providerError, completeProviderSignIn]);

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16, backgroundColor: colors.cell }}>
      {error ? (
        <>
          <Banner message={error} />
          <Button title="Back to Log In" onPress={() => router.replace("/login")} />
        </>
      ) : (
        <>
          <Loading />
          <Text style={{ textAlign: "center", fontSize: 15, color: colors.secondaryLabel }}>Finishing sign-in…</Text>
        </>
      )}
    </View>
  );
}
