import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";
import { ReviewCard } from "@/components/review-card";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { Text } from "@/components/text";
import { Button, EmptyState, ErrorState, Icon, Loading, PageTitle, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pluralize } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

export default function MyReviewsScreen() {
  const { user, status } = useAuth();
  const reviews = useQuery({ queryKey: keys.myReviews, queryFn: api.reviews.mine, enabled: !!user });

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8, gap: 12 }}
      refreshControl={user ? <RefreshControl refreshing={reviews.isRefetching} onRefresh={() => reviews.refetch()} tintColor={colors.accent} /> : undefined}
    >
      <View style={{ gap: 6, marginBottom: 8 }}>
        <PageTitle>My Reviews</PageTitle>
        {reviews.data && reviews.data.length > 0 && (
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.secondaryLabel }}>{pluralize(reviews.data.length, "review")}</Text>
        )}
      </View>

      {status === "loading" ? (
        <Loading />
      ) : !user ? (
        <SignInPrompt
          icon={{ sf: "star", md: "star_outline" }}
          title="Your reviews live here"
          message="Log in to write reviews with photos and keep track of everything you've shared."
        />
      ) : reviews.isPending ? (
        <Loading />
      ) : reviews.isError ? (
        <ErrorState message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
      ) : reviews.data.length === 0 ? (
        <EmptyState
          icon={{ sf: "square.and.pencil", md: "rate_review" }}
          title="No reviews yet"
          message="Find a supplier or shipping company you've worked with and share how it went."
          action={<Button title="Discover Businesses" onPress={() => router.navigate("/")} />}
        />
      ) : (
        reviews.data.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            heading={
              <Link href={`/company/${r.company}`} asChild>
                <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 10, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.label }}>
                    {r.company_name ?? `Company #${r.company}`}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accent }}>View</Text>
                  <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={14} color={colors.accent} weight="semibold" />
                </Pressable>
              </Link>
            }
            footer={
              <Button
                title="Edit review"
                variant="outline"
                icon={{ sf: "pencil", md: "edit" }}
                style={{ marginTop: 6 }}
                onPress={() => router.push({ pathname: "/review-editor", params: { companyId: String(r.company), reviewId: String(r.id), companyName: r.company_name ?? "" } })}
              />
            }
          />
        ))
      )}
    </Screen>
  );
}
