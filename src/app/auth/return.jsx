import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Text } from "@/components/text";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";

// The app's URL scheme (app.json "scheme").
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || "trastimport";

/**
 * Web page that hands a phone sign-in back to the app. Google only sends people back to https
 * addresses, so on phones the server's redirect_uri is this page (EXPO_PUBLIC_OAUTH_RETURN_URL);
 * it forwards ?code=…&state=… to trastimport://auth/callback, which the app's sign-in session
 * is waiting for. Add this page's full URL to the server's SOCIAL_AUTH_REDIRECT_URIS and to the
 * Google OAuth client's authorised redirect URIs.
 */
export default function AuthReturnScreen() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (process.env.EXPO_OS !== "web") return;
    const url = `${APP_SCHEME}://auth/callback${globalThis.location?.search ?? ""}`;
    setTarget(url);
    globalThis.location.replace(url);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: colors.cell }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink, textAlign: "center" }}>Returning to TrastImport…</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: colors.inkSecondary, textAlign: "center", maxWidth: 320 }}>
        If the app doesn't open by itself, tap the button below.
      </Text>
      {target && <Button title="Open TrastImport" variant="ink" onPress={() => Linking.openURL(target)} style={{ minWidth: 220 }} />}
    </View>
  );
}
