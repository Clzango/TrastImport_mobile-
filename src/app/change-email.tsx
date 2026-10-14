import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Banner, Button, Field, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";

export default function ChangeEmailScreen() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.auth.setEmail(password, email.trim()),
    onSuccess: async () => {
      haptic("success");
      await refreshUser().catch(() => {});
      router.back();
    },
  });
  const errors = formErrors(mutation.error, ["new_email", "current_password"]);

  return (
    <Screen>
      <Banner message={errors.banner} />
      <Section footer={`Currently ${user?.email ?? ""}. You'll use the new address to log in.`}>
        <Field label="New email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errors.field.new_email} />
        <Field label="Current password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" error={errors.field.current_password} />
      </Section>
      <Button title="Change Email" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!email.includes("@") || !password} />
    </Screen>
  );
}
