import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActionSheetIOS, Alert, Linking, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo, companyLocation } from "@/components/company-card";
import { ReviewItem } from "@/components/review-card";
import { Text } from "@/components/text";
import { Button, EmptyState, ErrorState, Icon, IconButton, Loading, Panel, Row, Screen, Tag, haptic } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { addressTypeLabel, companyTypeLabel, formatRating, pluralize, ratingValue } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useSaved } from "@/lib/saved";
import { colors, radius } from "@/lib/theme";

const PREVIEW_REVIEWS = 3;

function contactChannels(c) {
  const channels = [];
  if (c.phone) channels.push({ label: `Call ${c.phone}`, run: () => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`) });
  if (c.wechat_id)
    channels.push({
      label: "Copy WeChat ID",
      run: async () => {
        await Clipboard.setStringAsync(c.wechat_id);
        haptic("success");
        if (process.env.EXPO_OS !== "web") Alert.alert("WeChat ID copied", `Paste ${c.wechat_id} into WeChat to add them.`);
      },
    });
  if (c.website) {
    const url = /^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`;
    channels.push({ label: "Open website", run: () => WebBrowser.openBrowserAsync(url, { controlsColor: colors.accent }) });
  }
  return channels;
}

function Stat({ value, label, star }) {
  return (
    <View style={{ flex: 1, gap: 2, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.groupedBackground, borderRadius: radius.cell, borderCurve: "continuous" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {star && <Text style={{ fontSize: 16, color: colors.star }}>★</Text>}
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, fontWeight: "800", color: colors.label, fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 12, color: colors.secondaryLabel }}>{label}</Text>
    </View>
  );
}

export default function CompanyScreen() {
  const id = Number(useLocalSearchParams().id);
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const requireAuth = useRequireAuth();
  const { isSaved, toggle } = useSaved();
  const [showAll, setShowAll] = useState(false);

  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const reviews = useInfiniteQuery({
    queryKey: keys.companyReviews(id),
    queryFn: ({ pageParam }) => api.companies.reviews(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * 20 : undefined),
  });
  const mine = useQuery({ queryKey: keys.myCompanies, queryFn: api.companies.mine, enabled: status === "signedIn" });
  // Reviews are linked to the customer profile, not the user account.
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me, enabled: status === "signedIn" });

  if (company.isPending) return <Loading />;
  if (company.isError) {
    return (
      <Screen>
        <ErrorState message={errorMessage(company.error)} onRetry={() => company.refetch()} />
      </Screen>
    );
  }

  const c = company.data;
  const rating = ratingValue(c.average_rating);
  const allReviews = reviews.data?.pages.flatMap((p) => p.results) ?? [];
  const visibleReviews = showAll ? allReviews : allReviews.slice(0, PREVIEW_REVIEWS);
  const myReview = user && customer.data ? allReviews.find((r) => r.customer_id === customer.data.id) : undefined;
  const isOwner = !!mine.data?.some((m) => m.id === c.id);
  const saved = isSaved(c.id);
  const channels = contactChannels(c);
  const location = companyLocation(c);
  const tags = (c.company_type === "LOG" ? c.routes_serviced : c.main_products)
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
  const third =
    c.company_type === "SUP" && c.moq
      ? { value: String(c.moq), label: "Min. order" }
      : c.company_type === "LOG" && tags.length
        ? { value: String(tags.length), label: tags.length === 1 ? "Route" : "Routes" }
        : { value: String(c.addresses.length), label: c.addresses.length === 1 ? "Location" : "Locations" };

  const writeReview = () =>
    requireAuth(() =>
      router.push({
        pathname: "/review-editor",
        params: { companyId: String(c.id), companyName: c.name, ...(myReview ? { reviewId: String(myReview.id) } : {}) },
      }),
    );

  const contact = () => {
    if (channels.length === 1 || process.env.EXPO_OS === "web") return channels[0]?.run();
    if (process.env.EXPO_OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: `Contact ${c.name}`, options: [...channels.map((ch) => ch.label), "Cancel"], cancelButtonIndex: channels.length, tintColor: colors.accent },
        (i) => i < channels.length && channels[i].run(),
      );
    } else {
      Alert.alert(`Contact ${c.name}`, undefined, channels.map((ch) => ({ text: ch.label, onPress: ch.run })), { cancelable: true });
    }
  };

  const share = () => Share.share({ message: `${c.name} on TrastImport: ★ ${formatRating(rating)} from ${pluralize(c.review_count, "review")}.` });

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: "row" }}>
              <IconButton icon={{ sf: "square.and.arrow.up", md: "share" }} label="Share" onPress={share} />
              <IconButton
                icon={{ sf: "bookmark", md: "bookmark_border" }}
                activeIcon={{ sf: "bookmark.fill", md: "bookmark" }}
                active={saved}
                label={saved ? "Remove from saved" : "Save company"}
                onPress={() => toggle(c)}
              />
            </View>
          ),
        }}
      />

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
        {/* Identity */}
        <Panel style={{ borderTopWidth: 0, gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
            <CompanyLogo company={c} size={64} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text selectable accessibilityRole="header" style={{ fontSize: 20, lineHeight: 25, fontWeight: "800", color: colors.label, letterSpacing: -0.2 }}>
                {c.name}
              </Text>
              {location ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name={{ sf: "mappin", md: "location_on" }} size={15} color={colors.secondaryLabel} />
                  <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>{location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {c.is_verified && (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.infoSoft, borderRadius: radius.cell, paddingVertical: 12, paddingHorizontal: 14 }}>
              <Icon name={{ sf: "checkmark.shield", md: "verified_user" }} size={20} color={colors.info} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.info }}>Verified business</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: colors.bodyText }}>Checked by TrastImport before it was listed.</Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat star value={formatRating(rating)} label={pluralize(c.review_count, "review")} />
            <Stat value={companyTypeLabel[c.company_type]} label="Business type" />
            <Stat value={third.value} label={third.label} />
          </View>
        </Panel>

        {/* About */}
        {(c.description || tags.length > 0) && (
          <Panel title="About">
            {c.description ? <Text selectable style={{ fontSize: 15, lineHeight: 23, color: colors.bodyText }}>{c.description}</Text> : null}
            {tags.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </View>
            )}
          </Panel>
        )}

        {/* Contact */}
        {(c.phone || c.wechat_id || c.website) && (
          <Panel title="Contact" style={{ gap: 0, paddingBottom: 8 }}>
            {c.phone ? <Row inset={false} icon={{ sf: "phone", md: "call" }} title="Phone" subtitle={c.phone} onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} /> : null}
            {c.wechat_id ? (
              <View style={{ borderTopWidth: c.phone ? 1 : 0, borderTopColor: colors.separator }}>
                <Row inset={false} icon={{ sf: "message", md: "chat" }} title="WeChat" subtitle={c.wechat_id} selectable onPress={channels.find((ch) => ch.label === "Copy WeChat ID")?.run} />
              </View>
            ) : null}
            {c.website ? (
              <View style={{ borderTopWidth: c.phone || c.wechat_id ? 1 : 0, borderTopColor: colors.separator }}>
                <Row inset={false} icon={{ sf: "globe", md: "language" }} title="Website" subtitle={c.website.replace(/^https?:\/\//, "")} onPress={channels.find((ch) => ch.label === "Open website")?.run} />
              </View>
            ) : null}
          </Panel>
        )}

        {/* Locations */}
        {c.addresses.length > 0 && (
          <Panel title="Locations" style={{ gap: 0, paddingBottom: 8 }}>
            {c.addresses.map((a, i) => (
              <View key={a.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator }}>
                <Row
                  inset={false}
                  icon={{ sf: "mappin.and.ellipse", md: "location_on" }}
                  title={addressTypeLabel[a.address_type] ?? a.address_type}
                  subtitle={[a.street_address, a.city, a.country].filter(Boolean).join(", ")}
                  selectable
                />
              </View>
            ))}
          </Panel>
        )}

        {/* Reviews */}
        <Panel
          title="Reviews"
          action={
            allReviews.length > PREVIEW_REVIEWS && !showAll ? (
              <Text onPress={() => setShowAll(true)} style={{ fontSize: 14, fontWeight: "700", color: colors.accent, paddingVertical: 10 }} accessibilityRole="button">
                See all {c.review_count}
              </Text>
            ) : undefined
          }
          style={{ gap: 14 }}
        >
          {reviews.isPending ? (
            <Loading />
          ) : reviews.isError ? (
            <ErrorState message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
          ) : allReviews.length === 0 ? (
            <EmptyState icon={{ sf: "star", md: "star_outline" }} title="No reviews yet" message={`Worked with ${c.name}? Be the first to tell other importers how it went.`} />
          ) : (
            visibleReviews.map((r, i) => (
              <ReviewItem
                key={r.id}
                review={r}
                divider={i > 0}
                footer={
                  isOwner ? (
                    <Button
                      title={r.reply ? "Edit reply" : "Reply"}
                      variant="outline"
                      onPress={() => router.push({ pathname: "/reply/[id]", params: { id: String(r.id), companyId: String(c.id) } })}
                    />
                  ) : undefined
                }
              />
            ))
          )}
          {showAll && reviews.hasNextPage && <Button title="Load more reviews" variant="plain" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} />}
        </Panel>

        {/* Claim */}
        {!c.has_owner && (
          <Panel title="Own this business?">
            <Text style={{ fontSize: 14, lineHeight: 21, color: colors.secondaryLabel }}>
              Claim the listing to update its details and reply to reviews. An admin checks every claim.
            </Text>
            <Button title="Claim this company" variant="outline" onPress={() => requireAuth(() => router.push(`/claim/${c.id}`))} />
          </Panel>
        )}
      </ScrollView>

      {/* Sticky actions */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: process.env.EXPO_OS === "web" ? 12 : Math.max(insets.bottom, 12), backgroundColor: colors.cell, borderTopWidth: 1, borderTopColor: colors.border }}>
        {isOwner ? (
          <Button title="Manage company" style={{ flex: 1 }} onPress={() => router.push(`/manage/${c.id}`)} />
        ) : (
          <>
            <Button title={myReview ? "Edit review" : "Write review"} variant={channels.length ? "outline" : "filled"} style={channels.length ? undefined : { flex: 1 }} onPress={writeReview} />
            {channels.length > 0 && <Button title="Contact company" style={{ flex: 1 }} onPress={contact} />}
          </>
        )}
      </View>
    </View>
  );
}
