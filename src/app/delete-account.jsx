import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Banner, Button, Field, Screen, Section } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";

export default function DeleteAccountScreen() {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.auth.deleteAccount(password),
    // Signing out swaps the app for Log in (see the root layout).
    onSuccess: () => signOut(),
  });
  const errors = formErrors(mutation.error, ["current_password"]);

  return (
    <Screen>
      <Banner tone="danger" message="This permanently deletes your TrastImport account and profile. It can't be undone." />
      <Banner message={errors.banner} />
      <Section footer="Enter your password to confirm.">
        <Field label="Current password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" error={errors.field.current_password} />
      </Section>
      <Button title="Delete My Account" variant="destructive" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!password} />
    </Screen>
  );
}
