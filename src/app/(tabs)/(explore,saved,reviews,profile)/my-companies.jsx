import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, View } from "react-native";
import { Text } from "@/components/text";
import { CompanyLogo } from "@/components/company-card";
import { EmptyState, ErrorState, Loading, Row, Screen, Section } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { companyTypeLabel, formatRating, pluralize } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

export default function MyCompaniesScreen() {
  const companies = useQuery({ queryKey: keys.myCompanies, queryFn: api.companies.mine });

  if (companies.isPending) return <Loading />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={companies.isRefetching} onRefresh={() => companies.refetch()} tintColor={colors.accent} />}>
      {companies.isError ? (
        <ErrorState message={errorMessage(companies.error)} onRetry={() => companies.refetch()} />
      ) : companies.data.length === 0 ? (
        <EmptyState
          icon={{ sf: "building.2", md: "domain" }}
          title="No companies yet"
          message="When an admin approves your claim, the company shows up here so you can edit it and reply to reviews."
        />
      ) : (
        <Section footer="Edit your listing, manage addresses and reply to reviews.">
          {companies.data.map((c) => (
            <View key={c.id} style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16 }}>
              <CompanyLogo company={c} size={40} />
              <View style={{ flex: 1 }}>
                <Row
                  title={c.name}
                  subtitle={`${companyTypeLabel[c.company_type]} · ★ ${formatRating(c.average_rating)} · ${pluralize(c.review_count, "review")}`}
                  onPress={() => router.push(`/manage/${c.id}`)}
                />
              </View>
            </View>
          ))}
        </Section>
      )}
      {companies.isSuccess && companies.data.length > 0 && (
        <Text style={{ fontSize: 13, color: colors.secondaryLabel, textAlign: "center" }}>Only admins add new companies. To manage another one, claim it from its page.</Text>
      )}
    </Screen>
  );
}
