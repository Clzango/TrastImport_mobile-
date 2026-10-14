import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Banner, Button, EmptyState, Field, Screen, Section } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";

// Opened from the reset email: https://<FRONTEND_DOMAIN>/reset-password/{uid}/{token}
// (needs Universal Links / App Links on that domain to land here).
export default function ResetPasswordScreen() {
  const { uid, token } = useLocalSearchParams<{ uid: string; token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({ mutationFn: () => api.auth.resetPasswordConfirm(uid, token, password) });
  const errors = formErrors(mutation.error, ["new_password"]);
  const mismatch = confirm.length > 0 && confirm !== password;

  if (mutation.isSuccess) {
    return (
      <Screen>
        <EmptyState
          icon={{ sf: "checkmark.circle.fill", md: "check_circle" }}
          title="Password updated"
          message="You can now log in with your new password."
          action={<Button title="Log In" onPress={() => router.replace("/login")} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Banner message={errors.banner} />
      <Section footer="Use at least 8 characters.">
        <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={errors.field.new_password} />
        <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" error={mismatch ? "Passwords don't match." : undefined} />
      </Section>
      <Button title="Set Password" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!password || password !== confirm} />
    </Screen>
  );
}
