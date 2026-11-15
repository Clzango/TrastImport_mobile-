import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppleSignInButton } from "@/components/apple-sign-in";
import { OrDivider } from "@/components/auth-ui";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { Text } from "@/components/text";
import { Banner, haptic } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, radius } from "@/lib/theme";

// Which sign-in options this build can offer.
//  - Apple: iOS, through Apple's own button.
//  - Google on web: Google's own button, which returns an ID token for /auth/google/.
//  - Google on phones: the system browser through the server (/auth/o/google-oauth2/). Google only
//    accepts https return addresses, so it needs EXPO_PUBLIC_OAUTH_RETURN_URL, the web page in
//    app/auth/return.jsx that hands the result back to the app.
//  - WeChat: web only for now. Its browser login is a QR code; phones need WeChat's mobile SDK.
const IS_WEB = process.env.EXPO_OS === "web";
const APPLE = process.env.EXPO_OS === "ios";
const GOOGLE_WEB = IS_WEB && !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_NATIVE = !IS_WEB && !!process.env.EXPO_PUBLIC_OAUTH_RETURN_URL;
const WECHAT = IS_WEB;
export const HAS_SOCIAL_SIGN_IN = APPLE || GOOGLE_WEB || GOOGLE_NATIVE || WECHAT;

const PROVIDERS = {
  google: {
    label: "Continue with Google",
    short: "Google",
    mark: require("@/assets/images/google-mark.png"),
    background: colors.cell,
    pressed: colors.steel,
    border: colors.steelBorder,
    text: colors.ink,
  },
  wechat: {
    label: "Continue with WeChat",
    short: "WeChat",
    mark: require("@/assets/images/wechat-mark.png"),
    background: "#07C160",
    pressed: "#06A955",
    border: "#07C160",
    text: "#FFFFFF",
  },
};

/** Full-width "Continue with …" button with the provider's mark. */
export function ProviderButton({ provider, onPress, loading, compact }) {
  const p = PROVIDERS[provider];
  return (
    <Pressable
      onPress={() => (haptic(), onPress())}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={p.label}
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        borderRadius: radius.button,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderColor: p.border,
        backgroundColor: pressed ? p.pressed : p.background,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      })}
    >
      {loading ? <ActivityIndicator color={p.text} /> : <Image source={p.mark} contentFit="contain" style={{ width: 20, height: 20 }} accessible={false} />}
      <Text style={{ fontSize: compact ? 15 : 16, fontWeight: "700", color: p.text }}>{compact ? p.short : p.label}</Text>
    </Pressable>
  );
}

/** "or" divider plus every sign-in option this build supports. Renders nothing when there are none. */
export function SocialSignIn({ label = "or" }) {
  const { signInWithGoogle, signInWithApple, signInWithProvider } = useAuth();
  const [loadError, setLoadError] = useState(null);
  const done = () => haptic("success");
  const googleToken = useMutation({ mutationFn: (idToken) => signInWithGoogle(idToken), onSuccess: done });
  const googleBrowser = useMutation({ mutationFn: () => signInWithProvider("google-oauth2"), onSuccess: (ok) => ok && done() });
  const wechat = useMutation({ mutationFn: () => signInWithProvider("weixin") });
  const apple = useMutation({
    mutationFn: ({ idToken, firstName, lastName }) => signInWithApple(idToken, firstName, lastName),
    onSuccess: done,
  });
  const error = googleToken.error ?? googleBrowser.error ?? wechat.error ?? apple.error ?? loadError;

  if (!HAS_SOCIAL_SIGN_IN) return null;
  return (
    <View style={{ gap: 12 }}>
      <OrDivider label={label} />
      <Banner message={error ? errorMessage(error) : null} />
      {APPLE && <AppleSignInButton onCredential={(credential) => apple.mutate(credential)} onError={setLoadError} />}
      {GOOGLE_WEB && <GoogleSignInButton onIdToken={(idToken) => googleToken.mutate(idToken)} onError={setLoadError} />}
      {/* Google and WeChat share a row when both are offered, as in the design. */}
      {(GOOGLE_NATIVE || WECHAT) && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {GOOGLE_NATIVE && <ProviderButton provider="google" compact={WECHAT} onPress={() => googleBrowser.mutate()} loading={googleBrowser.isPending} />}
          {WECHAT && <ProviderButton provider="wechat" compact={GOOGLE_NATIVE} onPress={() => wechat.mutate()} loading={wechat.isPending} />}
        </View>
      )}
    </View>
  );
}
