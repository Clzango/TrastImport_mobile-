import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo, companyMethods, companyTags } from "@/components/company-card";
import { ReviewItem } from "@/components/review-card";
import { Card, DepartureRow, RoundButton, Segments, SoonPill, TicketTear } from "@/components/shipping-ui";
import { Text } from "@/components/text";
import { Banner, Button, EmptyState, ErrorState, haptic, Icon, Loading, Row } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useOwnedCompanyIds } from "@/lib/ownership";
import { addressTypeLabel, countryName, formatRating, pluralize, ratingValue } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useSaved } from "@/lib/saved";
import { companyLine, deadlineText, departureTitle, METHOD_ORDER, METHODS, money, relativeDay, shipsBy, shipsTo, shortDate, transitText, UNIT_LABEL } from "@/lib/shipping";
import { colors, radius } from "@/lib/theme";

const PREVIEW_REVIEWS = 3;
const SITE = "https://trast-import-mobile.vercel.app";

const SHIPPING_TABS = [
  { value: "departures", label: "Departures" },
  { value: "prices", label: "Prices" },
  { value: "about", label: "About" },
  { value: "reviews", label: "Reviews" },
];
const SUPPLIER_TABS = [
  { value: "about", label: "Overview" },
  { value: "products", label: "Products" },
  { value: "reviews", label: "Reviews" },
  { value: "certifications", label: "Certificates" },
];

function Fact({ label, value, first }) {
  return (
    <View style={{ flex: 1, gap: 2, paddingLeft: first ? 0 : 14, borderLeftWidth: first ? 0 : 1, borderLeftColor: colors.separator }}>
      <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>{label}</Text>
      <Text numberOfLines={2} style={{ fontSize: 18, fontWeight: "700", color: colors.label }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ children, subtitle, action }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", color: colors.label }}>
          {children}
        </Text>
        {subtitle ? <Text style={{ fontSize: 16, lineHeight: 21, color: colors.secondaryLabel }}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** Thumbnails with a "+N" tile, opening the full-screen viewer. */
function Gallery({ urls }) {
  const shown = urls.slice(0, 4);
  const more = urls.length - shown.length;
  const open = (index) => router.push({ pathname: "/photos", params: { urls: JSON.stringify(urls), index: String(index) } });
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {shown.map((uri, i) => (
        <Pressable key={uri} onPress={() => open(i)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${urls.length}`} style={{ flex: 1, aspectRatio: 1, borderRadius: radius.cell, overflow: "hidden", backgroundColor: colors.fill }}>
          <Image source={{ uri }} contentFit="cover" transition={150} style={{ flex: 1 }} />
          {i === shown.length - 1 && more > 0 && (
            <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(13,31,51,0.55)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>+{more + 1}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Header button on navy: filled orange or outlined white. */
function HeaderAction({ title, icon, onPress, outline, loading }) {
  return (
    <Pressable
      onPress={() => (haptic(), onPress())}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderRadius: 14,
        borderWidth: outline ? 1.5 : 0,
        borderColor: colors.navyBorder,
        backgroundColor: outline ? (pressed ? "rgba(255,255,255,0.08)" : "transparent") : pressed ? colors.accentPressed : colors.accent,
        opacity: loading ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={20} color={colors.onNavy} />
      <Text style={{ fontSize: 19, fontWeight: "700", color: colors.onNavy }}>{loading ? "Opening…" : title}</Text>
    </Pressable>
  );
}

export default function CompanyScreen() {
  const id = Number(useLocalSearchParams().id);
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const owned = useOwnedCompanyIds();
  const { isSaved, toggle } = useSaved();
  const [tab, setTab] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [allDepartures, setAllDepartures] = useState(false);

  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const shipping = company.data?.company_type === "LOG";
  const departures = useQuery({
    queryKey: keys.departures({ company: id, open_only: true }),
    queryFn: () => api.departures.list({ company: id, open_only: true }),
    enabled: shipping,
  });
  const prices = useQuery({ queryKey: keys.prices({ company: id }), queryFn: () => api.prices.list({ company: id }), enabled: shipping });
  const reviews = useInfiniteQuery({
    queryKey: keys.companyReviews(id),
    queryFn: ({ pageParam }) => api.companies.reviews(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * 20 : undefined),
  });
  // Reviews are linked to the customer profile, not the user account.
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me, enabled: status === "signedIn" });

  const chat = useMutation({
    mutationFn: (draft) => api.chat.open(id).then((conversation) => ({ conversation, draft })),
    onSuccess: ({ conversation, draft }) => router.push({ pathname: "/chat/[id]", params: { id: String(conversation.id), ...(draft ? { draft } : {}) } }),
  });

  const upcoming = useMemo(
    () => [...(departures.data?.results ?? [])].sort((a, b) => a.departure_date.localeCompare(b.departure_date)),
    [departures.data],
  );
  const priceList = prices.data?.results ?? [];

  if (company.isPending) return <Loading />;
  if (company.isError) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 40, backgroundColor: colors.groupedBackground }}>
        <ErrorState message={errorMessage(company.error)} onRetry={() => company.refetch()} />
      </View>
    );
  }

  const c = company.data;
  const currentTab = tab ?? (shipping ? "departures" : "about");
  const rating = ratingValue(c.average_rating);
  const allReviews = reviews.data?.pages.flatMap((p) => p.results) ?? [];
  const visibleReviews = showAll ? allReviews : allReviews.slice(0, PREVIEW_REVIEWS);
  const myReview = user && customer.data ? allReviews.find((r) => r.customer_id === customer.data.id) : undefined;
  const isOwner = owned.includes(c.id);
  const saved = isSaved(c.id);
  const tags = companyTags(c, 30);
  const gallery = (c.photos ?? []).map((p) => (typeof p === "string" ? p : (p.image ?? p.url))).filter(Boolean);
  const certifications = (c.certifications ?? []).map((x) => (typeof x === "string" ? { name: x } : x));
  const website = c.website ? (/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`) : null;
  const next = upcoming[0];
  const destinations = shipsTo(c).length ? shipsTo(c) : [...new Set([...priceList, ...upcoming].map((x) => x.destination))];
  const methods = [...new Set([...priceList.map((p) => p.method), ...upcoming.map((d) => d.method), ...companyMethods(c)])];
  const cheapestKg = priceList.filter((p) => p.unit === "KG").sort((a, b) => Number(a.price) - Number(b.price))[0];
  const cheapestCbm = priceList.filter((p) => p.unit === "CBM").sort((a, b) => Number(a.price) - Number(b.price))[0];
  const cheapest = cheapestKg ?? cheapestCbm;
  const canEstimate = priceList.length > 0;

  const quoteDraft = shipping
    ? `Hello, I'd like a shipping quote.\n\nFrom: \nTo: ${next?.destination ?? ""}\nCargo: \nWeight / volume: \nReady date: `
    : `Hello, I'm interested in your products. Could you send me a quote?\n\nProduct: \nQuantity: \nDestination: `;
  const openChat = (draft) => (status === "signedIn" ? chat.mutate(draft) : router.push("/login"));
  const estimate = () => router.push(`/calculator/${c.id}`);

  const share = async () => {
    const url = `${SITE}/company/${c.id}`;
    try {
      await Share.share({ message: `${c.name} on TrastImport: ${url}`, url, title: c.name });
    } catch {
      await Clipboard.setStringAsync(url);
      if (process.env.EXPO_OS !== "web") Alert.alert("Link copied");
    }
  };

  const copyWeChat = async () => {
    await Clipboard.setStringAsync(c.wechat_id);
    haptic("success");
    if (process.env.EXPO_OS !== "web") Alert.alert("WeChat ID copied", `Paste ${c.wechat_id} into WeChat to add them.`);
  };

  const writeReview = () =>
    router.push({
      pathname: "/review-editor",
      params: { companyId: String(c.id), companyName: c.name, ...(myReview ? { reviewId: String(myReview.id) } : {}) },
    });

  // ---- Tab contents --------------------------------------------------------

  const departuresTab = (
    <Card>
      <SectionTitle subtitle="Drop your goods at the warehouse before the cut-off">Upcoming departures</SectionTitle>
      {departures.isPending ? (
        <Loading />
      ) : departures.isError ? (
        <ErrorState message={errorMessage(departures.error)} onRetry={() => departures.refetch()} />
      ) : upcoming.length === 0 ? (
        <EmptyState icon={{ sf: "calendar", md: "event" }} title="No departures scheduled" message={`Ask ${c.name} when their next shipment leaves.`} />
      ) : (
        <View style={{ gap: 12 }}>
          {(allDepartures ? upcoming : upcoming.slice(0, 4)).map((d) => (
            <DepartureRow key={d.id} departure={d} />
          ))}
          {!allDepartures && upcoming.length > 4 && <Button title={`Show all ${upcoming.length} departures`} variant="plain" onPress={() => setAllDepartures(true)} />}
        </View>
      )}
    </Card>
  );

  const pricesTab = (
    <Card>
      <SectionTitle subtitle="Per destination and shipping method, in US dollars">Prices</SectionTitle>
      {prices.isPending ? (
        <Loading />
      ) : prices.isError ? (
        <ErrorState message={errorMessage(prices.error)} onRetry={() => prices.refetch()} />
      ) : priceList.length === 0 ? (
        <EmptyState icon={{ sf: "dollarsign.circle", md: "payments" }} title="No prices listed" message="Send a quote request and the company will reply with a price." />
      ) : (
        <View style={{ gap: 18 }}>
          {[...new Set(priceList.map((p) => p.destination))].map((dest) => (
            <View key={dest} style={{ gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.bodyText }}>To {dest}</Text>
              {priceList
                .filter((p) => p.destination === dest)
                .sort((a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method))
                .map((p) => (
                  <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: METHODS[p.method]?.bg, alignItems: "center", justifyContent: "center" }}>
                      <Icon name={METHODS[p.method]?.icon} size={20} color={METHODS[p.method]?.fg} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.label }}>{METHODS[p.method]?.label ?? p.method}</Text>
                      <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>
                        {[transitText(p), p.battery_surcharge ? `+${money(p.battery_surcharge)} with batteries` : null].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 19, fontWeight: "700", color: colors.label }}>{money(p.price)}</Text>
                      <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>{UNIT_LABEL[p.unit] ?? p.unit}</Text>
                    </View>
                  </View>
                ))}
            </View>
          ))}
          <Button title="Calculate shipping cost" variant="accentOutline" icon={{ sf: "function", md: "calculate" }} onPress={estimate} style={{ borderRadius: 14 }} />
        </View>
      )}
    </Card>
  );

  const contact =
    c.phone || c.wechat_id || website ? (
      <View style={{ gap: 2 }}>
        <SectionTitle>Contact details</SectionTitle>
        {c.phone ? <Row inset={false} icon={{ sf: "phone", md: "call" }} title="Phone" subtitle={c.phone} onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} /> : null}
        {c.wechat_id ? <Row inset={false} icon={{ sf: "message", md: "chat" }} title="WeChat" subtitle={`${c.wechat_id} · tap to copy`} selectable onPress={copyWeChat} /> : null}
        {website ? <Row inset={false} icon={{ sf: "globe", md: "language" }} title="Website" subtitle={c.website.replace(/^https?:\/\//, "")} onPress={() => WebBrowser.openBrowserAsync(website, { controlsColor: colors.accent })} /> : null}
      </View>
    ) : null;

  const aboutTab = (
    <Card>
      <View style={{ gap: 8 }}>
        <SectionTitle>About us</SectionTitle>
        <Text selectable style={{ fontSize: 17, lineHeight: 25, color: colors.secondaryLabel }}>
          {c.description || `${c.name} hasn't added a description yet.`}
        </Text>
      </View>
      {!shipping && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Fact first label="Min. order" value={c.moq ? `${Number(c.moq).toLocaleString()} pcs` : "—"} />
          <Fact label="Response" value={c.response_time || "—"} />
          <Fact label="Output" value={c.annual_output || "—"} />
        </View>
      )}
      {gallery.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle>Photos</SectionTitle>
          <Gallery urls={gallery} />
        </View>
      )}
      {contact}
      {c.addresses.length > 0 && (
        <View style={{ gap: 2 }}>
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
    </Card>
  );

  const productsTab = (
    <Card>
      {tags.length ? (
        <View style={{ gap: 2 }}>
          <SectionTitle>Main products</SectionTitle>
          {tags.map((t, i) => (
            <Pressable
              key={t}
              onPress={() => router.push({ pathname: "/search", params: { q: t } })}
              accessibilityRole="link"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={{ sf: "shippingbox", md: "inventory_2" }} size={19} color={colors.accent} />
              </View>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: colors.label }}>{t}</Text>
              <Text style={{ fontSize: 15, color: colors.tertiaryLabel }}>Similar suppliers</Text>
              <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={14} color={colors.tertiaryLabel} />
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState icon={{ sf: "shippingbox", md: "inventory_2" }} title="No products listed" message="Message the supplier for their catalog." />
      )}
    </Card>
  );

  const certificationsTab = (
    <Card>
      {certifications.length ? (
        certifications.map((x, i) => (
          <View key={`${x.name}${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator, paddingTop: i ? 12 : 0 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={{ sf: "rosette", md: "workspace_premium" }} size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.label }}>{x.name}</Text>
              {x.issuer || x.valid_until ? <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>{[x.issuer, x.valid_until && `Valid until ${x.valid_until}`].filter(Boolean).join(" · ")}</Text> : null}
            </View>
          </View>
        ))
      ) : (
        <EmptyState icon={{ sf: "rosette", md: "workspace_premium" }} title="No certificates listed" message="Ask the supplier for ISO, CE or other certificates before you order." />
      )}
    </Card>
  );

  const reviewsTab = (
    <Card>
      <SectionTitle>Reviews ({c.review_count})</SectionTitle>
      {!isOwner && (
        <Button title={myReview ? "Edit your review" : "Write a review"} variant="accentOutline" icon={{ sf: "square.and.pencil", md: "rate_review" }} onPress={writeReview} style={{ borderRadius: 14 }} />
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
            footer={isOwner ? <Button title={r.reply ? "Edit reply" : "Reply"} variant="outline" onPress={() => router.push({ pathname: "/reply/[id]", params: { id: String(r.id), companyId: String(c.id) } })} /> : undefined}
          />
        ))
      )}
      {!showAll && allReviews.length > PREVIEW_REVIEWS && <Button title={`See all ${c.review_count} reviews`} variant="plain" onPress={() => setShowAll(true)} />}
      {showAll && reviews.hasNextPage && <Button title="Load more reviews" variant="plain" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} />}
    </Card>
  );

  const content = { departures: departuresTab, prices: pricesTab, about: aboutTab, products: productsTab, reviews: reviewsTab, certifications: certificationsTab }[currentTab];

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Navy header */}
        <View style={{ backgroundColor: colors.navy, paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: shipping ? 84 : 24, gap: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <RoundButton icon={{ sf: "chevron.left", md: "arrow_back" }} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <RoundButton icon={{ sf: "square.and.arrow.up", md: "ios_share" }} label="Share" onPress={share} />
              <RoundButton
                icon={saved ? { sf: "heart.fill", md: "favorite" } : { sf: "heart", md: "favorite_border" }}
                label={saved ? "Remove from favorites" : "Add to favorites"}
                active={saved}
                onPress={() => (haptic(), toggle(c))}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <CompanyLogo company={c} size={100} light />
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable accessibilityRole="header" style={{ fontSize: 30, lineHeight: 34, fontWeight: "700", color: colors.onNavy }}>
                {c.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {c.is_verified && <Icon name={{ sf: "checkmark.shield", md: "verified_user" }} size={16} color={colors.onNavySuccess} />}
                <Text style={{ flexShrink: 1, fontSize: 17, color: c.is_verified ? colors.onNavySuccess : colors.onNavySecondary }}>{companyLine(c)}</Text>
              </View>
              <Pressable onPress={() => setTab("reviews")} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                <Text style={{ fontSize: 18, color: rating === null ? "rgba(255,255,255,0.4)" : colors.amber }}>★</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.onNavy }}>{formatRating(rating)}</Text>
                <Text style={{ fontSize: 17, color: colors.onNavySecondary, textDecorationLine: "underline" }}>{pluralize(c.review_count, "review")}</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {isOwner ? (
              <HeaderAction title="Manage company" icon={{ sf: "slider.horizontal.3", md: "tune" }} onPress={() => router.push(`/manage/${c.id}`)} />
            ) : (
              <>
                {shipping ? (
                  <HeaderAction title="Estimate cost" icon={{ sf: "function", md: "calculate" }} onPress={canEstimate ? estimate : () => openChat(quoteDraft)} />
                ) : (
                  <HeaderAction title="Request quote" icon={{ sf: "doc.text", md: "request_quote" }} loading={chat.isPending && !!chat.variables} onPress={() => openChat(quoteDraft)} />
                )}
                <HeaderAction title="Message" icon={{ sf: "bubble.left", md: "chat_bubble_outline" }} outline loading={chat.isPending && !chat.variables} onPress={() => openChat(undefined)} />
              </>
            )}
          </View>
        </View>

        {/* Next departure ticket, overlapping the header */}
        {shipping && (
          <View style={{ marginTop: -64, marginHorizontal: 16, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16, boxShadow: "0 6px 20px rgba(13,31,51,0.10)" }}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 17, color: colors.secondaryLabel }}>Next departure</Text>
                {next ? <SoonPill label={relativeDay(next.departure_date)} /> : null}
              </View>
              {next ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Icon name={METHODS[next.method]?.icon} size={24} color={colors.accent} />
                    <Text style={{ flexShrink: 1, fontSize: 26, fontWeight: "700", color: colors.label }}>{departureTitle(next)}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: colors.accent }}>
                    {shortDate(next.departure_date)}, drop off by {deadlineText(next.dropoff_deadline)}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 20, fontWeight: "700", color: colors.label }}>{departures.isPending ? "Loading…" : "None scheduled yet"}</Text>
              )}
            </View>
            <TicketTear cut={colors.groupedBackground} />
            <View style={{ flexDirection: "row" }}>
              <Fact first label="Ships to" value={destinations.slice(0, 3).join(", ") || "—"} />
              <Fact label="Ships by" value={shipsBy(methods) || "—"} />
              <Fact label="Customs" value={c.customs_included ? "Included" : "Not included"} />
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 16 }}>
          <Segments options={shipping ? SHIPPING_TABS : SUPPLIER_TABS} value={currentTab} onChange={setTab} large />
          {content}
          {!isOwner && (
            <Pressable
              onPress={() => router.push(`/claim/${c.id}`)}
              accessibilityRole="link"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, opacity: pressed ? 0.6 : 1 })}
            >
              <Icon name={{ sf: "flag", md: "outlined_flag" }} size={16} color={colors.secondaryLabel} />
              <Text style={{ fontSize: 16, color: colors.secondaryLabel, textDecorationLine: "underline" }}>Report this listing or request ownership</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: process.env.EXPO_OS === "web" ? 14 : Math.max(insets.bottom, 12), backgroundColor: colors.cell, borderTopWidth: 1, borderTopColor: colors.separator }}>
        <Banner message={chat.error ? errorMessage(chat.error) : null} />
        {shipping && !isOwner ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ flex: 1 }}>
              {cheapest ? (
                <>
                  <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>From</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit>
                    <Text style={{ fontSize: 28, fontWeight: "700", color: colors.label }}>{money(cheapest.price)}</Text>
                    <Text style={{ fontSize: 17, color: colors.secondaryLabel }}>
                      {" "}
                      {UNIT_LABEL[cheapest.unit]} {cheapest.unit === "KG" ? "by air" : "by sea"}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>Prices on request</Text>
              )}
            </View>
            <Button
              title={canEstimate ? "Get a quote" : "Request a quote"}
              loading={chat.isPending && !!chat.variables}
              onPress={canEstimate ? estimate : () => openChat(quoteDraft)}
              style={{ paddingHorizontal: 28, minHeight: 60 }}
            />
          </View>
        ) : isOwner ? (
          <Button title="Manage company" onPress={() => router.push(`/manage/${c.id}`)} />
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Contact supplier" loading={chat.isPending && !chat.variables} onPress={() => openChat(undefined)} style={{ flex: 1 }} />
            <Button title="Request quote" variant="accentOutline" loading={chat.isPending && !!chat.variables} onPress={() => openChat(quoteDraft)} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    </View>
  );
}
