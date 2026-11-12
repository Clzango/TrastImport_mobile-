import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyCard, CompanyLogo, ShippingCompanyCard } from "@/components/company-card";
import { LanguageButton } from "@/components/language";
import { DashedLine, DepartureRow, SoonPill, TicketTear } from "@/components/shipping-ui";
import { Text } from "@/components/text";
import { ErrorState, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { photos } from "@/lib/photos";
import { keys } from "@/lib/query-keys";
import { clock, daysFromToday, homeCity, METHODS, relativeDay, shortDate } from "@/lib/shipping";
import { colors, radius } from "@/lib/theme";

const QUICK = [
  { label: "Suppliers", icon: { sf: "building.2", md: "factory" }, params: { type: "SUP" } },
  { label: "Shipping", icon: { sf: "ferry", md: "directions_boat" }, params: { type: "LOG" } },
  { label: "Products", icon: { sf: "shippingbox", md: "inventory_2" }, params: { type: "SUP", focus: "1" } },
  { label: "Industries", icon: { sf: "square.on.circle", md: "category" }, industries: true },
];

// Keyword searches; the API matches them against products, routes, names and descriptions.
const CATEGORIES = [
  { label: "Electronics", icon: { sf: "desktopcomputer", md: "computer" } },
  { label: "Textiles", icon: { sf: "tshirt", md: "checkroom" } },
  { label: "Machinery", icon: { sf: "gearshape.2", md: "precision_manufacturing" } },
  { label: "Home & Living", query: "Furniture", icon: { sf: "house", md: "chair" } },
  { label: "Packaging", icon: { sf: "shippingbox", md: "inventory_2" } },
  { label: "Auto Parts", icon: { sf: "car", md: "directions_car" } },
];

const BOARD_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "SEA", label: "Sea" },
  { value: "AIR", label: "Air" },
];
const BOARD_PREVIEW = 4;

const openSearch = (params = {}) => router.push({ pathname: "/search", params });

function SectionHeader({ title, onSeeAll, seeAllLabel = "See all" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700", color: colors.label }}>
        {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link" style={{ minHeight: 36, justifyContent: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.accent }}>{seeAllLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function BrandRow() {
  return (
    <View accessibilityRole="header" accessibilityLabel="TrastImport">
      <Image source={require("../../../../assets/images/trastimport-logo.png")} contentFit="contain" style={{ width: 196, height: 48 }} accessibilityLabel="TrastImport — Find Suppliers. Connect. Ship Worldwide." />
    </View>
  );
}

/** Boxed quick link: outline icon over a label. */
function QuickTile({ label, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", gap: 9, minHeight: 92, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.fill : colors.cell, boxShadow: "0 5px 16px rgba(16,38,63,0.035)" })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft }}>
        <Icon name={icon} size={21} color={colors.accent} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: colors.label }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The navy "Next departure" ticket at the top of Explore. */
function NextDepartureTicket({ departure: d }) {
  const company = useQuery({ queryKey: keys.company(d.company), queryFn: () => api.companies.get(d.company) });
  const from = (company.data && homeCity(company.data)) || "China";
  const name = d.company_info?.name ?? company.data?.name ?? "";
  const plane = METHODS[d.method]?.icon ?? METHODS.AIR.icon;
  const dropDays = daysFromToday(d.dropoff_deadline);
  const dropoff = dropDays === 0 ? `Today ${clock(d.dropoff_deadline)}` : dropDays === 1 ? `Tomorrow ${clock(d.dropoff_deadline)}` : `${shortDate(d.dropoff_deadline)} ${clock(d.dropoff_deadline)}`;
  const open = () => router.push(`/company/${d.company}`);

  return (
    <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`Next departure from ${from} to ${d.destination}, ${relativeDay(d.departure_date)}. ${name}`} style={({ pressed }) => ({ marginHorizontal: 16, opacity: pressed ? 0.95 : 1 })}>
      <View style={{ borderRadius: 24, borderCurve: "continuous", overflow: "hidden", backgroundColor: colors.navy }}>
        <View style={{ padding: 20, paddingBottom: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, color: colors.onNavySecondary }}>
              Next departure from {from}
            </Text>
            <SoonPill label={relativeDay(d.departure_date)} onNavy />
          </View>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, color: colors.onNavySecondary }}>From</Text>
              <Text style={{ fontSize: 16, color: colors.onNavySecondary }}>To</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 30, fontWeight: "700", color: colors.onNavy }}>
                {from}
              </Text>
              <View style={{ flexGrow: 1, flexShrink: 0, minWidth: 64, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <DashedLine color="rgba(255,255,255,0.35)" style={{ flex: 1 }} />
                <Icon name={plane} size={22} color={colors.amber} />
                <DashedLine color="rgba(255,255,255,0.35)" style={{ flex: 1 }} />
              </View>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 30, fontWeight: "700", color: colors.onNavy }}>
                {d.destination}
              </Text>
            </View>
          </View>
          <TicketTear cut={colors.groupedBackground} line="rgba(255,255,255,0.3)" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Departs", value: shortDate(d.departure_date) },
              { label: "Drop off by", value: dropoff, amber: true },
              { label: "Service", value: METHODS[d.method]?.label ?? d.method },
            ].map((f) => (
              <View key={f.label} style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, color: colors.onNavySecondary }}>{f.label}</Text>
                <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "700", color: f.amber ? colors.amberText : colors.onNavy }}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.navyRaised }}>
          <CompanyLogo company={{ id: d.company, name: name || "?" }} size={36} light />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: "600", color: colors.onNavy }}>
            {name}
          </Text>
          <Text style={{ fontSize: 17, fontWeight: "600", color: colors.amberText }}>Details</Text>
          <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={15} color={colors.amberText} weight="semibold" />
        </View>
      </View>
    </Pressable>
  );
}

/** Photo banner shown while no shipping company has posted a departure. */
function ShippingBanner() {
  return (
    <Pressable onPress={() => openSearch({ type: "LOG" })} accessibilityRole="link" style={({ pressed }) => ({ marginHorizontal: 16, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ borderRadius: 24, borderCurve: "continuous", overflow: "hidden", minHeight: 170, padding: 20, justifyContent: "center", backgroundColor: colors.navy }}>
        <Image source={photos.exploreHero} contentFit="cover" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} accessible={false} />
        <LinearGradient colors={["rgba(13,31,51,0.92)", "rgba(13,31,51,0.4)", "rgba(13,31,51,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{ maxWidth: "65%", gap: 8 }}>
          <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: "700", color: colors.onNavy }}>Reliable Shipping for Your Global Business</Text>
          <Text style={{ fontSize: 15, color: colors.onNavySecondary }}>Sea Freight · Air Freight · Express</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BoardFilter({ value, onChange }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
      {BOARD_FILTERS.map((f) => {
        const selected = f.value === value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{ height: 40, paddingHorizontal: 18, borderRadius: 999, justifyContent: "center", borderWidth: 1, borderColor: selected ? colors.navy : colors.border, backgroundColor: selected ? colors.navy : colors.cell }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: selected ? colors.onNavy : colors.bodyText }}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef(null);
  const [categoriesY, setCategoriesY] = useState(0);
  const [board, setBoard] = useState("ALL");
  const [boardAll, setBoardAll] = useState(false);

  const departures = useQuery({ queryKey: keys.departures({ open_only: true }), queryFn: () => api.departures.list({ open_only: true }) });
  const shipping = useQuery({
    queryKey: keys.companies({ company_type: "LOG", ordering: "-average_rating" }),
    queryFn: () => api.companies.list({ company_type: "LOG", ordering: "-average_rating" }),
  });
  const featured = useQuery({
    queryKey: keys.companies({ featured: true }),
    queryFn: () => api.companies.list({ company_type: "SUP", is_verified: true, ordering: "-average_rating" }),
  });

  const upcoming = useMemo(
    () => [...(departures.data?.results ?? [])].sort((a, b) => a.departure_date.localeCompare(b.departure_date) || a.dropoff_deadline.localeCompare(b.dropoff_deadline)),
    [departures.data],
  );
  const boardRows = upcoming.filter((d) => board === "ALL" || (board === "SEA" ? d.method === "SEA" : d.method !== "SEA"));
  const shownRows = boardAll ? boardRows : boardRows.slice(0, BOARD_PREVIEW);
  const refreshing = departures.isRefetching || shipping.isRefetching || featured.isRefetching;

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, gap: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            departures.refetch();
            shipping.refetch();
            featured.refetch();
          }}
          tintColor={colors.accent}
        />
      }
    >
      {/* Brand + search */}
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BrandRow />
          <LanguageButton />
        </View>
        <Pressable
          onPress={() => openSearch({ focus: "1" })}
          accessibilityRole="search"
          accessibilityLabel="Search suppliers, products or shipping"
          style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 64, paddingLeft: 18, paddingRight: 8, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border }}
        >
          <Icon name={{ sf: "magnifyingglass", md: "search" }} size={22} color={colors.secondaryLabel} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, color: colors.tertiaryLabel }}>
            Search suppliers, products or shipping…
          </Text>
          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "slider.horizontal.3", md: "tune" }} size={20} color={colors.label} />
          </View>
        </Pressable>
      </View>

      {/* Next departure, or a photo banner until there is one */}
      {upcoming[0] ? <NextDepartureTicket departure={upcoming[0]} /> : departures.isPending ? null : <ShippingBanner />}

      {/* Quick links */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: -8 }}>
        {QUICK.map((q) => (
          <QuickTile
            key={q.label}
            label={q.label}
            icon={q.icon}
            onPress={() => (q.industries ? scroll.current?.scrollTo({ y: categoriesY - 12, animated: true }) : openSearch(q.params))}
          />
        ))}
      </View>

      {/* Shipping companies carousel */}
      {!(shipping.isSuccess && shipping.data.results.length === 0) && (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Shipping companies" onSeeAll={() => openSearch({ type: "LOG", sort: "-average_rating" })} />
          {shipping.isPending ? (
            <Loading />
          ) : shipping.isError ? (
            <ErrorState message={errorMessage(shipping.error)} onRetry={() => shipping.refetch()} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {shipping.data.results.map((c) => (
                <ShippingCompanyCard key={c.id} company={c} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Departure board */}
      {upcoming.length > 0 && (
        <View style={{ gap: 14 }}>
          <SectionHeader
            title="Departure board"
            onSeeAll={boardRows.length > BOARD_PREVIEW ? () => setBoardAll((v) => !v) : undefined}
            seeAllLabel={boardAll ? "Show less" : "See all"}
          />
          <BoardFilter value={board} onChange={setBoard} />
          <View style={{ gap: 10, paddingHorizontal: 16 }}>
            {shownRows.length ? (
              shownRows.map((d) => <DepartureRow key={d.id} departure={d} company={d.company_info?.name} verified={d.company_info?.is_verified === true} onPress={() => router.push(`/company/${d.company}`)} />)
            ) : (
              <Text style={{ fontSize: 16, color: colors.secondaryLabel, paddingVertical: 8 }}>No {board === "SEA" ? "sea" : "air"} departures scheduled.</Text>
            )}
          </View>
        </View>
      )}

      {/* Featured suppliers: verified only, so the section is left out until there are some. */}
      {!(featured.isSuccess && featured.data.results.length === 0) && (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Featured suppliers" onSeeAll={() => openSearch({ type: "SUP", verified: "1", sort: "-average_rating" })} />
          {featured.isPending ? (
            <Loading />
          ) : featured.isError ? (
            <ErrorState message={errorMessage(featured.error)} onRetry={() => featured.refetch()} />
          ) : (
            <View style={{ gap: 12, paddingHorizontal: 16 }}>
              {featured.data.results.slice(0, 5).map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Categories */}
      <View style={{ gap: 14 }} onLayout={(e) => setCategoriesY(e.nativeEvent.layout.y)}>
        <SectionHeader title="Popular categories" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 }}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => openSearch({ q: c.query ?? c.label })}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.fill : colors.cell })}
            >
              <Icon name={c.icon} size={18} color={colors.label} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.label }}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
