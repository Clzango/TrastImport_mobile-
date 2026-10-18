import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppleSignInButton } from "@/components/apple-sign-in";
import { AuthHeader, Checkbox, OrDivider } from "@/components/auth-ui";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { Text } from "@/components/text";
import { Banner, Button, Field, haptic } from "@/components/ui";
import { api, errorMessage, isEmailNotConfirmed } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { colors } from "@/lib/theme";

// Google and WeChat are web-only for now (Google needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID; WeChat on
// phones needs WeChat's native SDK, since its web login is a QR code to scan). Apple is iOS-only.
const IS_WEB = process.env.EXPO_OS === "web";
const HAS_GOOGLE = IS_WEB && !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const HAS_PROVIDERS = IS_WEB || process.env.EXPO_OS === "ios";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple, signInWithProvider } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [providerLoadError, setProviderLoadError] = useState(null);

  // Signing in swaps this screen for the app (see the root layout); with two-step login the
  // emailed code is entered on /verify first.
  const login = useMutation({
    mutationFn: () => signIn(email.trim(), password, remember),
    onSuccess: (result) => {
      if (result?.otp) {
        router.push({ pathname: "/verify", params: { mode: "login", ticket: result.otp.ticket, email: result.otp.email, remember: remember ? "1" : "0" } });
      } else {
        haptic("success");
      }
    },
  });
  // Unconfirmed account: send a fresh code and enter it on /verify.
  const confirm = useMutation({
    mutationFn: () => api.auth.resendActivation(email.trim()),
    onSuccess: () => router.push({ pathname: "/verify", params: { mode: "signup", email: email.trim() } }),
  });
  const google = useMutation({ mutationFn: (idToken) => signInWithGoogle(idToken), onSuccess: () => haptic("success") });
  const apple = useMutation({
    mutationFn: ({ idToken, firstName, lastName }) => signInWithApple(idToken, firstName, lastName),
    onSuccess: () => haptic("success"),
  });
  const wechat = useMutation({ mutationFn: () => signInWithProvider("weixin") });
  const errors = formErrors(login.error, ["email", "password"]);
  const unconfirmed = isEmailNotConfirmed(login.error);
  const otherError = google.error ?? apple.error ?? wechat.error ?? confirm.error ?? providerLoadError;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cell }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        style={{ flex: 1, backgroundColor: colors.cell }}
        contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingTop: insets.top + 32, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
      >
        <AuthHeader />

      <View style={{ marginTop: 36, gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, color: colors.label }}>
          Welcome Back
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.secondaryLabel }}>Log in to your account to continue exploring global opportunities.</Text>
      </View>

      <View style={{ gap: 14, marginTop: 24 }}>
        <Banner message={errors.banner ?? (otherError ? errorMessage(otherError) : null)} />
        {unconfirmed && (
          <Button title="Confirm with a Code" variant="outline" icon={{ sf: "number", md: "pin" }} onPress={() => confirm.mutate()} loading={confirm.isPending} style={{ borderRadius: 999 }} />
        )}
        <Field
          inset={false}
          icon={{ sf: "envelope", md: "mail" }}
          accessibilityLabel="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          placeholder="Email address"
          error={errors.field.email}
        />
        <Field
          inset={false}
          icon={{ sf: "lock", md: "lock" }}
          accessibilityLabel="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          autoComplete="current-password"
          textContentType="password"
          placeholder="Password"
          returnKeyType="go"
          onSubmitEditing={() => email && password && login.mutate()}
          error={errors.field.password}
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Checkbox label="Remember me" value={remember} onChange={setRemember} />
          <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8} accessibilityRole="link" style={{ minHeight: 32, justifyContent: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accent }}>Forgot password?</Text>
          </Pressable>
        </View>
        <Button
          title="Log In"
          trailingIcon={{ sf: "arrow.right", md: "arrow_forward" }}
          onPress={() => login.mutate()}
          loading={login.isPending}
          disabled={!email || !password}
          style={{ marginTop: 4, minHeight: 54, borderRadius: 999 }}
        />
      </View>

      {HAS_PROVIDERS && (
        <View style={{ gap: 16, marginTop: 28 }}>
          <OrDivider />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {HAS_GOOGLE && (
              <View style={{ flexGrow: 1, flexBasis: 150 }}>
                <GoogleSignInButton onIdToken={(idToken) => google.mutate(idToken)} onError={setProviderLoadError} />
              </View>
            )}
            {process.env.EXPO_OS === "ios" && (
              <View style={{ flexGrow: 1, flexBasis: 150 }}>
                <AppleSignInButton onCredential={(credential) => apple.mutate(credential)} onError={setProviderLoadError} />
              </View>
            )}
            {IS_WEB && (
              <Button
                title="WeChat"
                variant="outline"
                icon={{ sf: "message.fill", md: "chat" }}
                loading={wechat.isPending}
                onPress={() => wechat.mutate()}
                style={{ flexGrow: 1, flexBasis: 150, borderRadius: 999, minHeight: 44 }}
              />
            )}
          </View>
        </View>
      )}

      <View style={{ flex: 1, minHeight: 32 }} />

      <Text style={{ textAlign: "center", fontSize: 15, color: colors.secondaryLabel }}>
        Don't have an account?{" "}
        <Text onPress={() => router.replace("/signup")} style={{ fontWeight: "700", color: colors.accent }} accessibilityRole="link">
          Sign Up
        </Text>
      </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
