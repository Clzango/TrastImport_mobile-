import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Banner, Button, Field, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.auth.setPassword(current, next),
    onSuccess: () => {
      haptic("success");
      router.back();
    },
  });
  const errors = formErrors(mutation.error, ["current_password", "new_password"]);

  return (
    <Screen>
      <Banner message={errors.banner} />
      <Section footer="Use at least 8 characters.">
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" error={errors.field.current_password} />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry textContentType="newPassword" autoComplete="new-password" error={errors.field.new_password} />
      </Section>
      <Button title="Change Password" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!current || next.length < 8} />
    </Screen>
  );
}
