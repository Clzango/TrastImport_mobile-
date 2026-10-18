import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo, companyLocation, companyServices, companyTags } from "@/components/company-card";
import { ReviewItem } from "@/components/review-card";
import { Text } from "@/components/text";
import { Banner, Button, EmptyState, ErrorState, haptic, Icon, Loading, Pill, Row, VerifiedBadge } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { addressTypeLabel, countryName, formatRating, pluralize, ratingValue } from "@/lib/format";
import { photos as stockPhotos } from "@/lib/photos";
import { keys } from "@/lib/query-keys";
import { useSaved } from "@/lib/saved";
import { colors, radius } from "@/lib/theme";

const PREVIEW_REVIEWS = 3;
const MAX_COVERAGE = 4;
const BLUE = "#2F6FE4";

/** Icon for a shipping service from its wording. */
function serviceIcon(text) {
  const t = text.toLowerCase();
  if (/air/.test(t)) return { sf: "airplane", md: "flight" };
  if (/express|courier|dhl|fedex|ups|truck|road|land/.test(t)) return { sf: "truck.box.fill", md: "local_shipping" };
  if (/rail|train/.test(t)) return { sf: "tram.fill", md: "train" };
  return { sf: "ferry.fill", md: "directions_boat" };
}

/** Coverage countries: `coverage_countries` (codes or names) when the API sends them, else address countries. */
function coverage(c) {
  const list = Array.isArray(c.coverage_countries) && c.coverage_countries.length ? c.coverage_countries : c.addresses.map((a) => a.country_code || a.country);
  return [...new Set(list.filter(Boolean))].map((v) => (/^[A-Z]{2}$/.test(v) ? countryName(v, v) : v));
}

function HeroButton({ icon, label, onPress, active }) {
  return (
    <Pressable
      onPress={() => (haptic(), onPress())}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      hitSlop={8}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name={icon} size={24} color="#FFFFFF" weight="semibold" />
    </Pressable>
  );
}

function Fact({ icon, label, value }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Icon name={icon} size={15} color={colors.secondaryLabel} />
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: colors.secondaryLabel }}>
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, fontWeight: "800", color: colors.label, paddingLeft: 20 }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return (
    <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: colors.label }}>
      {children}
    </Text>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.separator }} />;
}

/** Thumbnails with a "+N" tile, opening the full-screen viewer. */
function Gallery({ urls }) {
  const shown = urls.slice(0, 4);
  const more = urls.length - shown.length;
  const open = (index) => router.push({ pathname: "/photos", params: { urls: JSON.stringify(urls), index: String(index) } });
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {shown.map((uri, i) => {
        const last = i === shown.length - 1 && more > 0;
        return (
          <Pressable
            key={uri}
            onPress={() => open(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${urls.length}`}
            style={{ flex: 1, aspectRatio: 1, borderRadius: radius.cell, overflow: "hidden", backgroundColor: colors.fill }}
          >
            <Image source={{ uri }} contentFit="cover" transition={150} style={{ flex: 1 }} />
            {last && (
              <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(23,36,58,0.55)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFFFFF" }}>+{more + 1}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CompanyScreen() {
  const id = Number(useLocalSearchParams().id);
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const requireAuth = useRequireAuth();
  const { isSaved, toggle } = useSaved();
  const [tab, setTab] = useState("overview");
  const [showAll, setShowAll] = useState(false);
  const [allCountries, setAllCountries] = useState(false);

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

  const chat = useMutation({
    mutationFn: () => api.chat.open(id),
    onSuccess: (conversation, draft) => router.push({ pathname: "/chat/[id]", params: { id: String(conversation.id), ...(draft ? { draft } : {}) } }),
  });

  if (company.isPending) return <Loading />;
  if (company.isError) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 40, backgroundColor: colors.cell }}>
        <ErrorState message={errorMessage(company.error)} onRetry={() => company.refetch()} />
      </View>
    );
  }

  const c = company.data;
  const shipping = c.company_type === "LOG";
  const rating = ratingValue(c.average_rating);
  const allReviews = reviews.data?.pages.flatMap((p) => p.results) ?? [];
  const visibleReviews = showAll ? allReviews : allReviews.slice(0, PREVIEW_REVIEWS);
  const myReview = user && customer.data ? allReviews.find((r) => r.customer_id === customer.data.id) : undefined;
  const isOwner = !!mine.data?.some((m) => m.id === c.id);
  const saved = isSaved(c.id);
  const location = companyLocation(c);
  const tags = companyTags(c);
  const services = shipping ? companyServices(c) : [];
  const headerTags = tags.slice(0, 3);
  const countries = coverage(c);
  const shownCountries = allCountries ? countries : countries.slice(0, MAX_COVERAGE);
  const gallery = (c.photos ?? []).map((p) => (typeof p === "string" ? p : (p.image ?? p.url))).filter(Boolean);
  const certifications = (c.certifications ?? []).map((x) => (typeof x === "string" ? { name: x } : x));
  const website = c.website ? (/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`) : null;
  const hero = c.cover_image ? { uri: c.cover_image } : shipping ? stockPhotos.shipping : stockPhotos.supplier;
  const moq = c.moq ? (/^\d+$/.test(String(c.moq)) ? `${Number(c.moq).toLocaleString()} pcs` : String(c.moq)) : "—";

  const writeReview = () =>
    requireAuth(() =>
      router.push({
        pathname: "/review-editor",
        params: { companyId: String(c.id), companyName: c.name, ...(myReview ? { reviewId: String(myReview.id) } : {}) },
      }),
    );

  const quoteDraft = shipping
    ? `Hello, I'd like a shipping quote.\n\nFrom: \nTo: \nCargo: \nWeight / volume: \nReady date: `
    : `Hello, I'm interested in your products. Could you send me a quote?\n\nProduct: \nQuantity: \nDestination: `;

  const copyWeChat = async () => {
    await Clipboard.setStringAsync(c.wechat_id);
    haptic("success");
    if (process.env.EXPO_OS !== "web") Alert.alert("WeChat ID copied", `Paste ${c.wechat_id} into WeChat to add them.`);
  };

  const reviewsSection = (
    <View style={{ gap: 12 }}>
      {!isOwner && (
        <Button title={myReview ? "Edit Your Review" : "Write a Review"} variant="accentOutline" icon={{ sf: "square.and.pencil", md: "rate_review" }} onPress={writeReview} style={{ borderRadius: 999, minHeight: 46 }} />
      )}
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
                <Button title={r.reply ? "Edit reply" : "Reply"} variant="outline" onPress={() => router.push({ pathname: "/reply/[id]", params: { id: String(r.id), companyId: String(c.id) } })} />
              ) : undefined
            }
          />
        ))
      )}
      {!showAll && allReviews.length > PREVIEW_REVIEWS && <Button title={`See all ${c.review_count} reviews`} variant="plain" onPress={() => setShowAll(true)} />}
      {showAll && reviews.hasNextPage && <Button title="Load more reviews" variant="plain" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} />}
    </View>
  );

  const contactSection =
    c.phone || c.wechat_id || website ? (
      <View style={{ gap: 4 }}>
        <SectionTitle>Contact Details</SectionTitle>
        {c.phone ? <Row inset={false} icon={{ sf: "phone", md: "call" }} title="Phone" subtitle={c.phone} onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} /> : null}
        {c.wechat_id ? <Row inset={false} icon={{ sf: "message", md: "chat" }} title="WeChat" subtitle={`${c.wechat_id} · tap to copy`} selectable onPress={copyWeChat} /> : null}
        {website ? <Row inset={false} icon={{ sf: "globe", md: "language" }} title="Website" subtitle={c.website.replace(/^https?:\/\//, "")} onPress={() => WebBrowser.openBrowserAsync(website, { controlsColor: colors.accent })} /> : null}
      </View>
    ) : null;

  const claimSection = !c.has_owner ? (
    <View style={{ gap: 10, padding: 16, borderRadius: radius.card, backgroundColor: colors.groupedBackground }}>
      <Text style={{ fontSize: 15, fontWeight: "800", color: colors.label }}>Own this business?</Text>
      <Text style={{ fontSize: 14, lineHeight: 21, color: colors.secondaryLabel }}>Claim the listing to update its details, answer messages and reply to reviews. An admin checks every claim.</Text>
      <Button title="Claim this company" variant="outline" onPress={() => requireAuth(() => router.push(`/claim/${c.id}`))} style={{ borderRadius: 999, minHeight: 44 }} />
    </View>
  ) : null;

  const supplierTabs = [
    { value: "overview", label: "Overview" },
    { value: "products", label: "Products" },
    { value: "reviews", label: "Reviews" },
    { value: "certifications", label: "Certifications" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.cell }}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero photo */}
        <View style={{ height: 210 + insets.top, backgroundColor: colors.label }}>
          <Image source={hero} contentFit="cover" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} accessible={false} />
          <LinearGradient colors={["rgba(20,26,40,0.5)", "rgba(20,26,40,0)"]} locations={[0, 0.5]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: insets.top + 6, paddingHorizontal: 10 }}>
            <HeroButton icon={{ sf: "arrow.left", md: "arrow_back" }} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
            <HeroButton
              icon={saved ? { sf: "heart.fill", md: "favorite" } : { sf: "heart", md: "favorite_border" }}
              label={saved ? "Remove from favorites" : "Add to favorites"}
              active={saved}
              onPress={() => toggle(c)}
            />
          </View>
        </View>

        {/* White sheet over the photo */}
        <View style={{ marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.cell, paddingTop: 20, paddingHorizontal: 20, gap: 18 }}>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <CompanyLogo company={c} size={76} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text selectable accessibilityRole="header" style={{ fontSize: 20, lineHeight: 25, fontWeight: "800", color: colors.label, letterSpacing: -0.2 }}>
                {c.name}
              </Text>
              {c.is_verified && <VerifiedBadge />}
              {location ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name={{ sf: "mappin", md: "location_on" }} size={14} color={colors.secondaryLabel} />
                  <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>{location}</Text>
                </View>
              ) : null}
              {headerTags.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {headerTags.map((t) => (
                    <Pill key={t} label={t} />
                  ))}
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={{ fontSize: 16, color: rating === null ? colors.starEmpty : colors.star }}>★</Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.label }}>{formatRating(rating)}</Text>
                <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>· ({pluralize(c.review_count, "review")})</Text>
              </View>
            </View>
          </View>

          {shipping ? (
            <>
              <Divider />
              {services.length > 0 && (
                <View style={{ gap: 4 }}>
                  <SectionTitle>Services</SectionTitle>
                  {services.map((s, i) => (
                    <View key={`${s.name}${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F0FE", alignItems: "center", justifyContent: "center" }}>
                        <Icon name={serviceIcon(s.name)} size={20} color={BLUE} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.label }}>{s.name}</Text>
                      {s.transit ? <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>{s.transit}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
              {countries.length > 0 && (
                <View style={{ gap: 10 }}>
                  <SectionTitle>Coverage</SectionTitle>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.bodyText }}>Main Countries</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {shownCountries.map((name) => (
                      <View key={name} style={{ backgroundColor: colors.fill, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.bodyText }}>{name}</Text>
                      </View>
                    ))}
                    {!allCountries && countries.length > MAX_COVERAGE && (
                      <Text onPress={() => setAllCountries(true)} accessibilityRole="button" style={{ fontSize: 13, fontWeight: "700", color: BLUE, paddingHorizontal: 4, paddingVertical: 7 }}>
                        +{countries.length - MAX_COVERAGE} more
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {c.description ? (
                <View style={{ gap: 8 }}>
                  <SectionTitle>About Us</SectionTitle>
                  <Text selectable style={{ fontSize: 15, lineHeight: 23, color: colors.secondaryLabel }}>{c.description}</Text>
                </View>
              ) : null}
              <Divider />
              <SectionTitle>Reviews ({c.review_count})</SectionTitle>
              {reviewsSection}
              {contactSection}
              {claimSection}
            </>
          ) : (
            <>
              {/* Supplier tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                accessibilityRole="tablist"
                style={{ marginHorizontal: -20, borderBottomWidth: 1, borderBottomColor: colors.separator }}
                contentContainerStyle={{ paddingHorizontal: 12 }}
              >
                {supplierTabs.map((t) => {
                  const selected = tab === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setTab(t.value)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: selected ? colors.accent : "transparent", marginBottom: -1 }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: selected ? "700" : "500", color: selected ? colors.accent : colors.secondaryLabel }}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {tab === "overview" && (
                <>
                  <View style={{ gap: 8 }}>
                    <SectionTitle>About Us</SectionTitle>
                    <Text selectable style={{ fontSize: 15, lineHeight: 23, color: colors.secondaryLabel }}>
                      {c.description || `${c.name} hasn't added a description yet.`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Fact icon={{ sf: "clock.arrow.circlepath", md: "history" }} label="Response time" value={c.response_time || "—"} />
                    <Fact icon={{ sf: "shippingbox", md: "inventory_2" }} label="Min. Order" value={moq} />
                    <Fact icon={{ sf: "chart.line.uptrend.xyaxis", md: "trending_up" }} label="Annual Output" value={c.annual_output || "—"} />
                  </View>
                  {gallery.length > 0 && (
                    <View style={{ gap: 10 }}>
                      <SectionTitle>Photos & Products</SectionTitle>
                      <Gallery urls={gallery} />
                    </View>
                  )}
                  {contactSection}
                  {c.addresses.length > 0 && (
                    <View style={{ gap: 4 }}>
                      <SectionTitle>Locations</SectionTitle>
                      {c.addresses.map((a) => (
                        <Row
                          key={a.id}
                          inset={false}
                          icon={{ sf: "mappin.and.ellipse", md: "location_on" }}
                          title={addressTypeLabel[a.address_type] ?? a.address_type}
                          subtitle={[a.street_address, a.city, countryName(a.country_code, a.country)].filter(Boolean).join(", ")}
                          selectable
                        />
                      ))}
                    </View>
                  )}
                  {claimSection}
                </>
              )}

              {tab === "products" &&
                (tags.length || gallery.length ? (
                  <>
                    {tags.length > 0 && (
                      <View style={{ gap: 4 }}>
                        <SectionTitle>Main Products</SectionTitle>
                        {companyTags(c, 30).map((t, i) => (
                          <Pressable
                            key={t}
                            onPress={() => router.push({ pathname: "/search", params: { q: t } })}
                            accessibilityRole="link"
                            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator, opacity: pressed ? 0.6 : 1 })}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
                              <Icon name={{ sf: "shippingbox", md: "inventory_2" }} size={18} color={colors.accent} />
                            </View>
                            <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.label }}>{t}</Text>
                            <Text style={{ fontSize: 13, color: colors.tertiaryLabel }}>Similar suppliers</Text>
                            <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={14} color={colors.tertiaryLabel} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {gallery.length > 0 && (
                      <View style={{ gap: 10 }}>
                        <SectionTitle>Photos</SectionTitle>
                        <Gallery urls={gallery} />
                      </View>
                    )}
                  </>
                ) : (
                  <EmptyState icon={{ sf: "shippingbox", md: "inventory_2" }} title="No products listed" message="Ask the supplier for their catalog with Contact Supplier." />
                ))}

              {tab === "reviews" && reviewsSection}

              {tab === "certifications" &&
                (certifications.length ? (
                  <View style={{ gap: 4 }}>
                    {certifications.map((x, i) => (
                      <View key={`${x.name}${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}>
                          <Icon name={{ sf: "rosette", md: "workspace_premium" }} size={20} color={colors.success} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.label }}>{x.name}</Text>
                          {x.issuer || x.valid_until ? (
                            <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>{[x.issuer, x.valid_until && `Valid until ${x.valid_until}`].filter(Boolean).join(" · ")}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState icon={{ sf: "rosette", md: "workspace_premium" }} title="No certifications listed" message="Ask the supplier for ISO, CE or other certificates before you order." />
                ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={{ gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: process.env.EXPO_OS === "web" ? 14 : Math.max(insets.bottom, 12), backgroundColor: colors.cell }}>
        <Banner message={chat.error ? errorMessage(chat.error) : null} />
        {isOwner ? (
          <Button title="Manage Company" onPress={() => router.push(`/manage/${c.id}`)} style={{ borderRadius: 999 }} />
        ) : shipping ? (
          <>
            <Button title="Request Shipping Quote" loading={chat.isPending && !!chat.variables} onPress={() => requireAuth(() => chat.mutate(quoteDraft))} style={{ borderRadius: 999 }} />
            <Button title="Contact Company" variant="accentOutline" loading={chat.isPending && !chat.variables} onPress={() => requireAuth(() => chat.mutate(undefined))} style={{ borderRadius: 999 }} />
          </>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Contact Supplier" loading={chat.isPending && !chat.variables} onPress={() => requireAuth(() => chat.mutate(undefined))} style={{ flex: 1, borderRadius: 999 }} />
            <Button title="Request Quote" variant="accentOutline" loading={chat.isPending && !!chat.variables} onPress={() => requireAuth(() => chat.mutate(quoteDraft))} style={{ flex: 1, borderRadius: 999 }} />
          </View>
        )}
      </View>
    </View>
  );
}
