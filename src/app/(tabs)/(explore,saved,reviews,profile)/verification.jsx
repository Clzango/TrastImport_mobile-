import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, View } from "react-native";
import { Text } from "@/components/text";
import { Banner, Button, ErrorState, Field, Icon, Loading, Pill, Row, Screen, Section, haptic } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pickDocument } from "@/lib/files";
import { formatDate, statusLabel } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

export default function VerificationScreen() {
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me });
  const requests = useQuery({ queryKey: keys.verifications, queryFn: api.verifications.list });
  const [document, setDocument] = useState(null);
  const [note, setNote] = useState("");
  const [pickError, setPickError] = useState(null);

  const submit = useMutation({
    mutationFn: () => api.verifications.create(document, note.trim()),
    onSuccess: () => {
      haptic("success");
      setDocument(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: keys.verifications });
    },
  });

  if (customer.isPending || requests.isPending) return <Loading />;
  if (customer.isError || requests.isError) {
    return (
      <Screen>
        <ErrorState message={errorMessage(customer.error ?? requests.error)} onRetry={() => (customer.refetch(), requests.refetch())} />
      </Screen>
    );
  }

  const verified = customer.data.is_verified;
  const latest = requests.data.results[0];
  const canRequest = !verified && latest?.status !== "PENDING";

  const choose = async () => {
    setPickError(null);
    try {
      const file = await pickDocument();
      if (file) setDocument(file);
    } catch (e) {
      setPickError(errorMessage(e));
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={requests.isRefetching} onRefresh={() => (customer.refetch(), requests.refetch())} tintColor={colors.accent} />}>
      <View style={{ alignItems: "center", gap: 10, paddingHorizontal: 16 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: verified ? colors.successSoft : colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={40} color={verified ? colors.success : colors.accent} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.label, textAlign: "center" }}>
          {verified ? "You're a verified buyer" : "Become a verified buyer"}
        </Text>
        <Text style={{ fontSize: 15, color: colors.secondaryLabel, textAlign: "center", lineHeight: 21 }}>
          {verified
            ? "The badge shows next to your name on every review, so companies and other buyers know you're a real importer."
            : "Send a business license, import license or ID. Once approved, a badge shows next to your name on every review you write."}
        </Text>
      </View>

      {latest && (
        <View style={{ backgroundColor: colors.cell, borderRadius: radius.card, borderCurve: "continuous", padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.label }}>Latest request</Text>
            <Pill label={statusLabel[latest.status]} tone={latest.status === "APPROVED" ? "success" : latest.status === "REJECTED" ? "danger" : "accent"} />
          </View>
          <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>
            Sent {formatDate(latest.date_created)}
            {latest.reviewed_at ? ` · Decided ${formatDate(latest.reviewed_at)}` : ""}
          </Text>
          {latest.status === "REJECTED" && latest.admin_note ? (
            <Text selectable style={{ fontSize: 15, color: colors.label }}>Rejected: {latest.admin_note}</Text>
          ) : null}
          {latest.status === "PENDING" && (
            <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>An admin is reviewing your document. We'll email you with the decision.</Text>
          )}
        </View>
      )}

      {canRequest && (
        <>
          <Banner message={submit.error ? errorMessage(submit.error) : pickError} />
          <Section
            header={latest?.status === "REJECTED" ? "Send a New Request" : "Your Document"}
            footer="PDF, JPG or PNG, up to 5 MB. Only TrastImport staff can see it."
          >
            <Row
              icon={{ sf: document ? "doc.fill" : "paperclip", md: document ? "description" : "attach_file" }}
              title={document ? document.name : "Choose Document"}
              tint={!document}
              onPress={choose}
              chevron={false}
              accessory={document ? <Text style={{ color: colors.accent, fontSize: 15 }}>Change</Text> : undefined}
            />
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Company name on the license" multiline maxLength={500} />
          </Section>
          <Button title="Send for Review" onPress={() => submit.mutate()} disabled={!document} loading={submit.isPending} />
        </>
      )}
    </Screen>
  );
}
