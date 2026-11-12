import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, View } from "react-native";
import { Text } from "@/components/text";
import { Button, EmptyState, ErrorState, Loading, Pill, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, statusLabel } from "@/lib/format";
import { useOwnedCompanyIds } from "@/lib/ownership";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

const tone = { PENDING: "accent", SCHEDULED: "accent", DISPUTED: "danger", APPROVED: "success", REJECTED: "danger" };
const kindLabel = { OWNERSHIP: "Ownership request", REPORT: "Report" };

/** What happens next, in one sentence. */
function nextStep(claim) {
  const report = claim.kind === "REPORT";
  switch (claim.status) {
    case "PENDING":
      if (claim.work_email && claim.work_email_confirmed === false) return `Open the link we emailed to ${claim.work_email} to confirm it. We review the request after that.`;
      return "A person at TrastImport is reviewing it. We'll email you when there's a decision.";
    case "SCHEDULED":
      return claim.transfer_at
        ? `Approved. The listing moves to your account on ${formatDate(claim.transfer_at)}, unless the current owner disputes it.`
        : "Approved. The listing moves to your account soon, unless the current owner disputes it.";
    case "DISPUTED":
      return "The current owner disputed the transfer. It's paused while we review both sides.";
    case "APPROVED":
      return report ? "We looked into your report and dealt with the listing." : "The listing is yours.";
    case "REJECTED":
      return report ? "We looked into your report and didn't change the listing." : "We couldn't confirm you run this company.";
    default:
      return "";
  }
}

function Card({ children }) {
  return <View style={{ backgroundColor: colors.cell, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 }}>{children}</View>;
}

function ClaimCard({ claim }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.label }}>
          {claim.company_name ?? `Company #${claim.company}`}
        </Text>
        <Pill label={statusLabel[claim.status] ?? claim.status} tone={tone[claim.status]} />
      </View>
      <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>
        {kindLabel[claim.kind] ?? "Ownership request"} · Sent {formatDate(claim.date_created)}
        {claim.reviewed_at ? ` · Reviewed ${formatDate(claim.reviewed_at)}` : ""}
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 21, color: colors.bodyText }}>{nextStep(claim)}</Text>
      {claim.message ? (
        <Text selectable numberOfLines={4} style={{ fontSize: 15, color: colors.secondaryLabel, lineHeight: 20 }}>
          “{claim.message}”
        </Text>
      ) : null}
      {claim.admin_note ? (
        <View style={{ backgroundColor: colors.fill, borderRadius: 10, padding: 10, gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.secondaryLabel }}>Note from TrastImport</Text>
          <Text selectable style={{ fontSize: 15, color: colors.label }}>{claim.admin_note}</Text>
        </View>
      ) : null}
      {claim.status === "APPROVED" && claim.kind !== "REPORT" && <Button title="Manage company" variant="outline" onPress={() => router.push(`/manage/${claim.company}`)} />}
    </Card>
  );
}

/** Someone asked to take over a listing this account owns. Disputes happen on the Manage screen. */
function IncomingCard({ claim }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.label }}>
          {claim.company_name ?? `Company #${claim.company}`}
        </Text>
        <Pill label={statusLabel[claim.status] ?? claim.status} tone={tone[claim.status]} />
      </View>
      <Text style={{ fontSize: 15, lineHeight: 21, color: colors.bodyText }}>
        {claim.status === "SCHEDULED"
          ? `Someone asked to take over this listing. It moves to their account on ${formatDate(claim.transfer_at)} unless you dispute it.`
          : claim.status === "DISPUTED"
            ? "You disputed the transfer. It's paused while we review both sides."
            : "Someone asked to take over this listing."}
      </Text>
      <Button title={claim.status === "SCHEDULED" ? "Review and dispute" : "Open company management"} variant={claim.status === "SCHEDULED" ? "filled" : "outline"} onPress={() => router.push(`/manage/${claim.company}`)} />
    </Card>
  );
}

export default function ClaimsScreen() {
  const claims = useQuery({ queryKey: keys.claims, queryFn: api.claims.list });
  const owned = useOwnedCompanyIds();
  const { refreshUser } = useAuth();
  const all = claims.data?.results ?? [];
  // Transfers aimed at the user's own listings come back in the same list.
  const incoming = all.filter((x) => owned.includes(x.company) && x.kind !== "REPORT" && ["SCHEDULED", "DISPUTED"].includes(x.status) && !x.message);
  const mine = all.filter((x) => !incoming.includes(x));

  return (
    <Screen
      contentContainerStyle={{ gap: 12 }}
      refreshControl={<RefreshControl refreshing={claims.isRefetching} onRefresh={() => (claims.refetch(), refreshUser().catch(() => {}))} tintColor={colors.accent} />}
    >
      {claims.isPending ? (
        <Loading />
      ) : claims.isError ? (
        <ErrorState message={errorMessage(claims.error)} onRetry={() => claims.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={{ sf: "building.2.crop.circle", md: "add_business" }}
          title="No requests"
          message="Run a company listed on TrastImport, or spotted a fake listing? Open the company's page and tap Report this listing or request ownership."
        />
      ) : (
        <>
          {incoming.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.secondaryLabel, marginHorizontal: 4 }}>About your companies</Text>
              {incoming.map((x) => (
                <IncomingCard key={x.id} claim={x} />
              ))}
            </View>
          )}
          {mine.length > 0 && (
            <View style={{ gap: 12 }}>
              {incoming.length > 0 && (
                <Text style={{ fontSize: 14, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.secondaryLabel, marginHorizontal: 4 }}>Your requests</Text>
              )}
              {mine.map((x) => (
                <ClaimCard key={x.id} claim={x} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
