import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AuthLayout, Checkbox } from "@/components/auth-ui";
import { MethodSwitch, PhoneStart } from "@/components/phone-sign-in";
import { SocialSignIn } from "@/components/social-sign-in";
import { Text } from "@/components/text";
import { Banner, Button, Field, haptic } from "@/components/ui";
import { api, errorMessage, isEmailNotConfirmed } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { colors } from "@/lib/theme";

// Apple, Google and WeChat buttons live in components/social-sign-in.jsx.

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [method, setMethod] = useState("email");

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
  const errors = formErrors(login.error, ["email", "password"]);
  const unconfirmed = isEmailNotConfirmed(login.error);
  const otherError = confirm.error;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your quotes and messages."
      footer={
        <Text style={{ textAlign: "center", fontSize: 15, color: colors.secondaryLabel }}>
          New to TrastImport?{" "}
          <Text onPress={() => router.replace("/signup")} style={{ fontWeight: "800", color: colors.container }} accessibilityRole="link">
            Create an account
          </Text>
        </Text>
      }
    >
      <MethodSwitch value={method} onChange={setMethod} />
      <View style={{ height: 18 }} />
      {method === "phone" ? (
        <PhoneStart />
      ) : (
      <View style={{ gap: 14 }}>
        <Banner message={errors.banner ?? (otherError ? errorMessage(otherError) : null)} />
        {unconfirmed && (
          <Button title="Email me a code instead" variant="outline" icon={{ sf: "envelope", md: "mail" }} onPress={() => confirm.mutate()} loading={confirm.isPending} />
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
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.container }}>Forgot password?</Text>
          </Pressable>
        </View>
        <Button
          title="Log in"
          variant="ink"
          onPress={() => login.mutate()}
          loading={login.isPending}
          disabled={!email || !password}
          style={{ marginTop: 4, minHeight: 56, boxShadow: "0 8px 20px rgba(15,27,42,0.22)" }}
        />
      </View>
      )}

      <View style={{ marginTop: 24 }}>
        <SocialSignIn />
      </View>

    </AuthLayout>
  );
}
