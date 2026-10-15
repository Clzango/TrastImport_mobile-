import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { Banner, BrandMark, Button, Field, haptic } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { colors } from "@/lib/theme";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => signUp({ ...form, email: form.email.trim() }),
    // Signing up swaps this screen for the app (see the root layout).
    onSuccess: () => haptic("success"),
  });
  const errors = formErrors(mutation.error, ["first_name", "last_name", "email", "password"]);
  const ready = form.first_name && form.email && form.password.length >= 8;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: process.env.EXPO_OS === "ios" ? 12 : insets.top + 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 28 }}
    >
      <View style={{ gap: 10, marginTop: 64 }}>
        <BrandMark size={48} />
        <Text accessibilityRole="header" style={{ marginTop: 14, fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, color: colors.label }}>
          Create your account
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.secondaryLabel }}>
          Reviews show your first name, last initial and country. Never your email or phone.
        </Text>
      </View>

      <View style={{ gap: 18, marginTop: 32 }}>
        <Banner message={errors.banner} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field inset={false} label="First name" value={form.first_name} onChangeText={set("first_name")} autoComplete="given-name" textContentType="givenName" error={errors.field.first_name} />
          </View>
          <View style={{ flex: 1 }}>
            <Field inset={false} label="Last name" value={form.last_name} onChangeText={set("last_name")} autoComplete="family-name" textContentType="familyName" error={errors.field.last_name} />
          </View>
        </View>
        <Field
          inset={false}
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="you@company.com"
          error={errors.field.email}
        />
        <Field
          inset={false}
          label="Password"
          value={form.password}
          onChangeText={set("password")}
          secureTextEntry
          revealable
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
          error={errors.field.password}
        />
        <Button title="Create Account" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!ready} style={{ marginTop: 6, minHeight: 54 }} />
      </View>

      <View style={{ flex: 1, minHeight: 32 }} />

      <Text style={{ textAlign: "center", fontSize: 15, color: colors.secondaryLabel }}>
        Already have an account?{" "}
        <Text onPress={() => router.replace("/login")} style={{ fontWeight: "700", color: colors.accent }} accessibilityRole="link">
          Log in
        </Text>
      </Text>
    </ScrollView>
  );
}
