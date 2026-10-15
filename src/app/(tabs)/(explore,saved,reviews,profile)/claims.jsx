import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, View } from "react-native";
import { Text } from "@/components/text";
import { Button, EmptyState, ErrorState, Loading, Pill, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, statusLabel } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

const tone = { PENDING: "accent", APPROVED: "success", REJECTED: "danger" };

function ClaimCard({ claim }) {
  return (
    <View style={{ backgroundColor: colors.cell, borderRadius: radius.card, borderCurve: "continuous", padding: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: "600", color: colors.label }}>
          {claim.company_name ?? `Company #${claim.company}`}
        </Text>
        <Pill label={statusLabel[claim.status]} tone={tone[claim.status]} />
      </View>
      <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>
        Sent {formatDate(claim.date_created)}
        {claim.reviewed_at ? ` · Decided ${formatDate(claim.reviewed_at)}` : ""}
      </Text>
      <Text selectable style={{ fontSize: 15, color: colors.label, lineHeight: 20 }}>{claim.message}</Text>
      {claim.admin_note ? (
        <View style={{ backgroundColor: colors.fill, borderRadius: 10, padding: 10, gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.secondaryLabel }}>Note from TrastImport</Text>
          <Text selectable style={{ fontSize: 15, color: colors.label }}>{claim.admin_note}</Text>
        </View>
      ) : null}
      {claim.status === "APPROVED" && <Button title="Manage Company" variant="tinted" onPress={() => router.push(`/manage/${claim.company}`)} />}
      {claim.status === "PENDING" && (
        <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>We'll email you when an admin decides.</Text>
      )}
    </View>
  );
}

export default function ClaimsScreen() {
  const claims = useQuery({ queryKey: keys.claims, queryFn: api.claims.list });

  return (
    <Screen
      contentContainerStyle={{ gap: 12 }}
      refreshControl={<RefreshControl refreshing={claims.isRefetching} onRefresh={() => claims.refetch()} tintColor={colors.accent} />}
    >
      {claims.isPending ? (
        <Loading />
      ) : claims.isError ? (
        <ErrorState message={errorMessage(claims.error)} onRetry={() => claims.refetch()} />
      ) : claims.data.results.length === 0 ? (
        <EmptyState
          icon={{ sf: "building.2.crop.circle", md: "add_business" }}
          title="No claims"
          message="Run a company listed on TrastImport? Open its page and tap Claim This Company to manage the listing and reply to reviews."
        />
      ) : (
        claims.data.results.map((c) => <ClaimCard key={c.id} claim={c} />)
      )}
    </Screen>
  );
}
