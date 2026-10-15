import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "@/components/text";
import { Banner, Button, EmptyState, Field, HeaderButton, Loading, Row, Screen, Section, haptic } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pickDocument } from "@/lib/files";
import { formErrors } from "@/lib/form-errors";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

export default function ClaimScreen() {
  const id = Number(useLocalSearchParams().id);
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const [message, setMessage] = useState("");
  const [document, setDocument] = useState(null);
  const [pickError, setPickError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => api.companies.claim(id, message.trim(), document ?? undefined),
    onSuccess: () => {
      haptic("success");
      queryClient.invalidateQueries({ queryKey: keys.claims });
    },
  });
  const errors = formErrors(mutation.error, ["message", "document"]);

  const choose = async () => {
    setPickError(null);
    try {
      const file = await pickDocument();
      if (file) setDocument(file);
    } catch (e) {
      setPickError(errorMessage(e));
    }
  };

  if (company.isPending) return <Loading />;

  if (mutation.isSuccess) {
    return (
      <Screen>
        <EmptyState
          icon={{ sf: "paperplane.fill", md: "send" }}
          title="Claim sent"
          message="An admin will review it and email you with the decision. You can follow it under Profile › My Claims."
          action={<Button title="Done" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
        }}
      />
      <Screen>
        <Text style={{ fontSize: 15, color: colors.secondaryLabel, lineHeight: 21, paddingHorizontal: 4 }}>
          Do you run <Text style={{ fontWeight: "600", color: colors.label }}>{company.data?.name ?? "this company"}</Text>? Once an admin approves your
          claim you can edit the listing and reply to reviews.
        </Text>

        <Banner message={errors.banner ?? pickError} />

        <Section header="Message" footer="Tell us your role at the company and how we can reach you to confirm.">
          <Field
            label="Role and contact"
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="e.g. I'm the export manager. Call me on +86 …"
            error={errors.field.message}
          />
        </Section>

        <Section header="Business license (optional)" footer="PDF, JPG or PNG, up to 5 MB. Private: only you and TrastImport staff can see it.">
          <Row
            title={document ? document.name : "Attach Document"}
            tint={!document}
            chevron={false}
            onPress={choose}
            accessory={document ? <Text style={{ color: colors.danger, fontSize: 15 }} onPress={() => setDocument(null)}>Remove</Text> : undefined}
          />
          {errors.field.document ? <Text style={{ color: colors.danger, fontSize: 13, padding: 12 }}>{errors.field.document}</Text> : null}
        </Section>

        <Button title="Send Claim" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!message.trim()} />
      </Screen>
    </>
  );
}
