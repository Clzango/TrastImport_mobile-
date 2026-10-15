import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { Banner, BrandMark, Button, Field, haptic } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithProvider } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signing in swaps this screen for the app (see the root layout), so no navigation here.
  const login = useMutation({
    mutationFn: () => signIn(email.trim(), password),
    onSuccess: () => haptic("success"),
  });
  const social = useMutation({
    mutationFn: (provider) => signInWithProvider(provider),
  });
  const errors = formErrors(login.error, ["email", "password"]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: (process.env.EXPO_OS === "ios" ? 12 : insets.top + 12), paddingHorizontal: 24, paddingBottom: insets.bottom + 28 }}
    >
      <View style={{ gap: 10, marginTop: 64 }}>
        <BrandMark size={48} />
        <Text accessibilityRole="header" style={{ marginTop: 14, fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, color: colors.label }}>
          Welcome back
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.secondaryLabel }}>Log in to save companies and share reviews.</Text>
      </View>

      <View style={{ gap: 18, marginTop: 32 }}>
        <Banner message={errors.banner ?? (social.error ? errorMessage(social.error) : null)} />
        <Field
          inset={false}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="nasone"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          placeholder="you@company.com"
          error={errors.field.email}
        />
        <Field
          inset={false}
          label="Password"
          labelAction={
            <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8} style={{ minHeight: 32, justifyContent: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.accent }}>Forgot password?</Text>
            </Pressable>
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          autoComplete="current-password"
          textContentType="password"
          placeholder="Enter your password"
          returnKeyType="go"
          onSubmitEditing={() => login.mutate()}
          error={errors.field.password}
        />
        <Button title="Log In" onPress={() => login.mutate()} loading={login.isPending} disabled={!email || !password} style={{ marginTop: 6, minHeight: 54 }} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 28, marginBottom: 20 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>or continue with</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Button
          title="Google"
          variant="outline"
          icon={{ sf: "globe", md: "language" }}
          style={{ flex: 1 }}
          loading={social.isPending && social.variables === "google-oauth2"}
          onPress={() => social.mutate("google-oauth2")}
        />
        <Button
          title="WeChat"
          variant="outline"
          icon={{ sf: "message", md: "chat" }}
          style={{ flex: 1 }}
          loading={social.isPending && social.variables === "weixin"}
          onPress={() => social.mutate("weixin")}
        />
      </View>

      <View style={{ flex: 1, minHeight: 32 }} />

      <Text style={{ textAlign: "center", fontSize: 15, color: colors.secondaryLabel }}>
        New to TrastImport?{" "}
        <Text onPress={() => router.replace("/signup")} style={{ fontWeight: "700", color: colors.accent }} accessibilityRole="link">
          Create account
        </Text>
      </Text>
    </ScrollView>
  );
}
