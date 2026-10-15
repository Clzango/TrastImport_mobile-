import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Banner, Button, EmptyState, Field, Screen, Section } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: () => api.auth.resetPassword(email.trim()) });
  const errors = formErrors(mutation.error, ["email"]);

  if (mutation.isSuccess) {
    return (
      <Screen>
        <EmptyState
          icon={{ sf: "envelope.badge", md: "mark_email_read" }}
          title="Check your email"
          message={`If an account exists for ${email.trim()}, we've sent a link to set a new password.`}
          action={<Button title="Done" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Banner message={errors.banner} />
      <Section footer="We'll email you a link to choose a new password.">
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          autoFocus
          error={errors.field.email}
          onSubmitEditing={() => email && mutation.mutate()}
        />
      </Section>
      <Button title="Send Reset Link" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!email.includes("@")} />
    </Screen>
  );
}
