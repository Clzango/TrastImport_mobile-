import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Segments } from "@/components/shipping-ui";
import { Text } from "@/components/text";
import { Banner, Button, EmptyState, ErrorState, Field, HeaderButton, Loading, Row, Screen, Section, haptic } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pickDocument } from "@/lib/files";
import { formErrors } from "@/lib/form-errors";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

const KINDS = [
  { value: "OWNERSHIP", label: "Request ownership" },
  { value: "REPORT", label: "Report this listing" },
];
const FIELDS = ["kind", "contact_name", "role", "work_email", "message", "document"];

/** "https://www.dragon-express.cn/about" → "dragon-express.cn". */
function websiteDomain(website) {
  if (!website) return null;
  try {
    const host = new URL(/^https?:\/\//.test(website) ? website : `https://${website}`).hostname;
    return host.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

function emailAtDomain(email, domain) {
  const at = email.trim().toLowerCase().split("@")[1];
  return !!domain && !!at && (at === domain || at.endsWith(`.${domain}`));
}

/** Request ownership of a listing, or report it (fake, impersonation, wrong details). */
export default function ClaimScreen() {
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });

  const [kind, setKind] = useState(params.kind === "REPORT" ? "REPORT" : "OWNERSHIP");
  const [contactName, setContactName] = useState(() => [user?.first_name, user?.last_name].filter(Boolean).join(" "));
  const [role, setRole] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [message, setMessage] = useState("");
  const [document, setDocument] = useState(null);
  const [pickError, setPickError] = useState(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.companies.claim(id, {
        kind,
        contact_name: contactName.trim(),
        role: role.trim(),
        work_email: workEmail.trim(),
        message: message.trim(),
        document,
      }),
    onSuccess: () => {
      haptic("success");
      queryClient.invalidateQueries({ queryKey: keys.claims });
    },
  });
  const errors = formErrors(mutation.error, FIELDS);

  const choose = async () => {
    setPickError(null);
    try {
      const file = await pickDocument();
      if (file) setDocument(file);
    } catch (e) {
      setPickError(errorMessage(e));
    }
  };

  const header = <Stack.Screen options={{ title: kind === "REPORT" ? "Report Listing" : "Request Ownership", headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} /> }} />;

  if (company.isPending) return <Loading />;
  if (company.isError) {
    return (
      <Screen>
        {header}
        <ErrorState message={errorMessage(company.error)} onRetry={() => company.refetch()} />
      </Screen>
    );
  }

  const c = company.data;
  const ownership = kind === "OWNERSHIP";
  // Reports, and requests for a listing someone already owns, need all four contact fields.
  const fullDetails = !ownership || c.has_owner;
  // Taking over an owned listing also needs evidence: a document, or a work email at the company's domain.
  const domain = websiteDomain(c.website);
  const needsEvidence = ownership && c.has_owner;
  const hasEvidence = !!document || emailAtDomain(workEmail, domain);
  const emailOk = !workEmail.trim() || /^\S+@\S+\.\S+$/.test(workEmail.trim());
  const ready =
    !!message.trim() && emailOk && (!fullDetails || (contactName.trim() && role.trim() && workEmail.trim())) && (!needsEvidence || hasEvidence);

  if (mutation.isSuccess) {
    const email = workEmail.trim();
    return (
      <Screen>
        <Stack.Screen options={{ title: "Request Sent", headerLeft: () => null }} />
        <EmptyState
          icon={{ sf: "paperplane.fill", md: "send" }}
          title={ownership ? "Ownership request sent" : "Report sent"}
          message={[
            "A person at TrastImport reviews every request.",
            email ? `We emailed a link to ${email}. Open it to confirm the address; we can't go ahead until you do.` : null,
            "Follow it under Profile › Settings › Ownership & Reports.",
          ]
            .filter(Boolean)
            .join(" ")}
          action={<Button title="Done" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <>
      {header}
      <Screen>
        <Segments options={KINDS} value={kind} onChange={setKind} />

        <Text style={{ fontSize: 16, color: colors.secondaryLabel, lineHeight: 22, paddingHorizontal: 4 }}>
          {ownership ? (
            <>
              Do you run <Text style={{ fontWeight: "700", color: colors.label }}>{c.name}</Text>?{" "}
              {c.has_owner
                ? "This listing already has an owner. If it's yours, send proof and we'll review it; the current owner is told and can dispute the transfer."
                : "Once we approve it, you can edit the listing, answer messages and reply to reviews."}
            </>
          ) : (
            <>
              Tell us what's wrong with <Text style={{ fontWeight: "700", color: colors.label }}>{c.name}</Text>: a fake listing, someone pretending to be your company, or wrong
              details.
            </>
          )}
        </Text>

        <Banner message={errors.banner ?? pickError} />

        <Section header="Your details" footer={fullDetails ? "All fields are required." : "Optional for a listing nobody owns yet, but they help us reach you."}>
          <Field label="Your name" value={contactName} onChangeText={setContactName} autoComplete="name" textContentType="name" error={errors.field.contact_name} />
          <Field label="Your role" value={role} onChangeText={setRole} placeholder={ownership ? "e.g. Export manager, owner" : "e.g. Owner of the real company, buyer"} error={errors.field.role} />
          <Field
            label="Work email"
            value={workEmail}
            onChangeText={setWorkEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder={domain ? `you@${domain}` : "you@yourcompany.com"}
            error={errors.field.work_email ?? (emailOk ? undefined : "Enter a valid email address.")}
          />
        </Section>

        <Section header="Why you're contacting us">
          <Field
            label="Message"
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={ownership ? "How you're connected to the company and how we can confirm it." : "What's wrong with this listing?"}
            error={errors.field.message}
          />
        </Section>

        <Section
          header={needsEvidence ? "Proof" : "Document (optional)"}
          footer={
            needsEvidence
              ? `Attach a business license or similar${domain ? `, or use a work email ending in @${domain}` : ""}. PDF, JPG or PNG, up to 5 MB. Never shown publicly.`
              : "PDF, JPG or PNG, up to 5 MB. Never shown publicly."
          }
        >
          <Row
            title={document ? document.name : "Attach document"}
            tint={!document}
            chevron={false}
            onPress={choose}
            accessory={
              document ? (
                <Text style={{ color: colors.danger, fontSize: 15 }} onPress={() => setDocument(null)}>
                  Remove
                </Text>
              ) : undefined
            }
          />
          {errors.field.document ? <Text style={{ color: colors.danger, fontSize: 13, padding: 12 }}>{errors.field.document}</Text> : null}
        </Section>

        {needsEvidence && !hasEvidence ? (
          <Text style={{ fontSize: 14, color: colors.secondaryLabel, paddingHorizontal: 4 }}>
            {domain ? `Add a document or use an email at ${domain} to send this request.` : "Add a document to send this request."}
          </Text>
        ) : null}

        <View style={{ gap: 8 }}>
          <Button title={ownership ? "Send request" : "Send report"} onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!ready} />
          <Text style={{ fontSize: 13, color: colors.tertiaryLabel, textAlign: "center" }}>You can have one open request per company.</Text>
        </View>
      </Screen>
    </>
  );
}
