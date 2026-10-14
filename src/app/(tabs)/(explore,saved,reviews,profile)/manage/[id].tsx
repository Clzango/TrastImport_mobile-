import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/text";
import { CompanyLogo } from "@/components/company-card";
import { ReviewCard } from "@/components/review-card";
import { Button, EmptyState, ErrorState, Loading, Row, Screen, Section } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { addressTypeLabel, companyTypeLabel, formatRating, pluralize } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

export default function ManageCompanyScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const reviews = useInfiniteQuery({
    queryKey: keys.companyReviews(id),
    queryFn: ({ pageParam }) => api.companies.reviews(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * 20 : undefined),
  });

  if (company.isPending) return <Loading />;
  if (company.isError) {
    return (
      <Screen>
        <ErrorState message={errorMessage(company.error)} onRetry={() => company.refetch()} />
      </Screen>
    );
  }

  const c = company.data;
  const allReviews = reviews.data?.pages.flatMap((p) => p.results) ?? [];
  const unanswered = allReviews.filter((r) => !r.reply).length;

  return (
    <>
      <Stack.Screen options={{ title: c.name }} />
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <CompanyLogo company={c} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.label }}>{c.name}</Text>
            <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>
              {companyTypeLabel[c.company_type]} · ★ {formatRating(c.average_rating)} · {pluralize(c.review_count, "review")}
            </Text>
          </View>
        </View>

        <Section header="Listing">
          <Row icon={{ sf: "pencil", md: "edit" }} title="Edit Listing" subtitle="Description, contact details, products and routes" onPress={() => router.push(`/edit-company/${c.id}`)} />
          <Row icon={{ sf: "eye.fill", md: "visibility" }} title="View Public Page" onPress={() => router.push(`/company/${c.id}`)} />
        </Section>

        <Section header="Addresses">
          {c.addresses.map((a) => (
            <Row
              key={a.id}
              title={addressTypeLabel[a.address_type] ?? a.address_type}
              subtitle={[a.street_address, a.city, a.country].filter(Boolean).join(", ")}
              onPress={() => router.push({ pathname: "/address-editor", params: { companyId: String(c.id), addressId: String(a.id) } })}
            />
          ))}
          <Row title="Add Address" tint chevron={false} onPress={() => router.push({ pathname: "/address-editor", params: { companyId: String(c.id) } })} />
        </Section>

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.label, paddingHorizontal: 4 }}>Reviews</Text>
          {unanswered > 0 && (
            <Text style={{ fontSize: 15, color: colors.secondaryLabel, paddingHorizontal: 4 }}>{pluralize(unanswered, "review")} without a reply</Text>
          )}
          {reviews.isPending ? (
            <Loading />
          ) : reviews.isError ? (
            <ErrorState message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
          ) : allReviews.length === 0 ? (
            <EmptyState icon={{ sf: "star.bubble", md: "reviews" }} title="No reviews yet" />
          ) : (
            allReviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                footer={
                  <Button
                    title={r.reply ? "Edit Reply" : "Reply"}
                    variant="tinted"
                    icon={{ sf: "arrowshape.turn.up.left.fill", md: "reply" }}
                    onPress={() => router.push({ pathname: "/reply/[id]", params: { id: String(r.id), companyId: String(c.id) } })}
                  />
                }
              />
            ))
          )}
          {reviews.hasNextPage && <Button title="Show More Reviews" variant="plain" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} />}
        </View>
      </Screen>
    </>
  );
}
