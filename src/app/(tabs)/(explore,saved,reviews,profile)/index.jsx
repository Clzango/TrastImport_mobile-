import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo, companyLocation, companyTags, FavoriteButton } from "@/components/company-card";
import { ProductGrid } from "@/components/product-card";
import { LanguageButton } from "@/components/language";
import { ContainerPanel } from "@/components/container-panel";
import { DashedLine, DepartureRow } from "@/components/shipping-ui";
import { Text } from "@/components/text";
import { ErrorState, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { clock, daysFromToday, homeCity, METHODS, relativeDay, shipsTo, shortDate } from "@/lib/shipping";
import { formatRating, pluralize, ratingValue } from "@/lib/format";
import { colors } from "@/lib/theme";

const QUICK = [
  { label: "Suppliers", icon: { sf: "building.2", md: "factory" }, params: { type: "SUP" } },
  { label: "Shipping", icon: { sf: "ferry", md: "directions_boat" }, params: { type: "LOG" } },
  { label: "Products", icon: { sf: "shippingbox", md: "inventory_2" }, products: true },
  { label: "Departures", icon: { sf: "calendar", md: "calendar_month" }, board: true },
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
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: colors.ink }}>
        {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link" style={{ minHeight: 36, justifyContent: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.container }}>{seeAllLabel}</Text>
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

/** Round quick link: a soft steel tile with the icon, label underneath. */
function QuickTile({ label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, alignItems: "center", gap: 8 }}>
      {({ pressed }) => (
        <>
          <View style={{ width: 58, height: 58, borderRadius: 16, borderCurve: "continuous", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.fill : colors.cell }}>
            <Icon name={icon} size={26} color={colors.ink} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>
            {label}
          </Text>
        </>
      )}
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
    <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`Next departure from ${from} to ${d.destination}, ${relativeDay(d.departure_date)}. ${name}`} style={({ pressed }) => ({ marginHorizontal: 20, opacity: pressed ? 0.94 : 1 })}>
      <ContainerPanel style={{ borderRadius: 20, padding: 20, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: colors.onNavySecondary }}>Next departure</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.cargo }}>
            <Icon name={{ sf: "clock.fill", md: "schedule" }} size={15} color={colors.cargoInk} />
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.cargoInk }}>{relativeDay(d.departure_date)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, color: colors.onAccent }}>
            {from}
          </Text>
          <View style={{ flexGrow: 1, flexShrink: 0, minWidth: 56, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <DashedLine color="rgba(255,255,255,0.6)" style={{ flex: 1 }} />
            <Icon name={plane} size={22} color={colors.onAccent} />
            <DashedLine color="rgba(255,255,255,0.6)" style={{ flex: 1 }} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, color: colors.onAccent }}>
            {d.destination}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.cell }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>
              Drop off by {dropoff}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.inkSecondary }}>
              {METHODS[d.method]?.label ?? d.method}
              {name ? ` with ${name}` : ""}
            </Text>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent }}>
            <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={18} color={colors.onAccent} weight="semibold" />
          </View>
        </View>
      </ContainerPanel>
    </Pressable>
  );
}

/** Shown while no shipping company has posted a departure: the same container card, inviting a search. */
function ShippingBanner() {
  return (
    <Pressable onPress={() => openSearch({ type: "LOG" })} accessibilityRole="link" accessibilityLabel="Browse shipping companies" style={({ pressed }) => ({ marginHorizontal: 20, opacity: pressed ? 0.94 : 1 })}>
      <ContainerPanel style={{ borderRadius: 20, padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { icon: { sf: "ferry", md: "directions_boat" }, label: "Sea" },
            { icon: { sf: "airplane", md: "flight" }, label: "Air" },
            { icon: { sf: "box.truck", md: "local_shipping" }, label: "Express" },
          ].map((m) => (
            <View key={m.label} style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.12)" }}>
              <Icon name={m.icon} size={15} color={colors.onAccent} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onAccent }}>{m.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 26, lineHeight: 30, fontWeight: "800", letterSpacing: -0.7, color: colors.onAccent }}>Find a carrier for your route</Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.onNavySecondary }}>Compare shipping companies, their prices and next departures.</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.cell }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink }}>Browse shipping companies</Text>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent }}>
            <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={18} color={colors.onAccent} weight="semibold" />
          </View>
        </View>
      </ContainerPanel>
    </Pressable>
  );
}

/** One shipping company in the Explore list: logo, name, where it ships from and to, rating. */
function ShippingRow({ company: c, last }) {
  const rating = ratingValue(c.average_rating);
  const from = homeCity(c);
  const to = shipsTo(c).slice(0, 2).join(", ");
  const route = from && to ? `${from} to ${to}` : from || to || "Shipping company";
  const next = c.next_departure ? relativeDay(c.next_departure) : null;
  return (
    <Pressable
      onPress={() => router.push(`/company/${c.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${c.name}, ${route}, ${formatRating(rating)} stars${next ? `, next departure ${next}` : ""}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator, opacity: pressed ? 0.7 : 1 })}
    >
      <CompanyLogo company={c} size={50} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: "700", color: colors.ink }}>
            {c.name}
          </Text>
          {c.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={16} color={colors.teal} />}
        </View>
        <Text numberOfLines={1} style={{ fontSize: 14, color: colors.inkSecondary }}>
          {route}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Icon name={{ sf: "star.fill", md: "star" }} size={15} color={rating === null ? colors.starEmpty : colors.container} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{formatRating(rating)}</Text>
        </View>
        {next ? (
          <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center", backgroundColor: colors.cargo }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: colors.cargoInk }}>{next}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** A supplier on Explore: who they are, what they make (product tags) and a short description. */
function SupplierCard({ company: c }) {
  const rating = ratingValue(c.average_rating);
  const location = companyLocation(c);
  const tags = companyTags(c, 6);
  const shown = tags.slice(0, 3);
  return (
    <Pressable
      onPress={() => router.push(`/company/${c.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${c.name}${location ? `, ${location}` : ""}. ${shown.join(", ")}`}
      style={({ pressed }) => ({ padding: 14, gap: 12, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.groupedBackground : colors.cell })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <CompanyLogo company={c} size={50} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: "800", color: colors.ink }}>
              {c.name}
            </Text>
            {c.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={16} color={colors.teal} />}
          </View>
          {location ? (
            <Text numberOfLines={1} style={{ fontSize: 14, color: colors.inkSecondary }}>
              {location}
            </Text>
          ) : null}
        </View>
        <FavoriteButton company={c} color={colors.inkSecondary} />
      </View>
      {c.description ? (
        <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, color: colors.bodyText }}>
          {c.description}
        </Text>
      ) : null}
      {shown.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {shown.map((t) => (
            <View key={t} style={{ height: 28, paddingHorizontal: 10, borderRadius: 8, justifyContent: "center", backgroundColor: colors.steel }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: colors.bodyText }}>{t}</Text>
            </View>
          ))}
          {tags.length > shown.length && (
            <View style={{ height: 28, paddingHorizontal: 10, borderRadius: 8, justifyContent: "center", backgroundColor: colors.steel }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.inkSecondary }}>+{tags.length - shown.length}</Text>
            </View>
          )}
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.separator }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name={{ sf: "star.fill", md: "star" }} size={15} color={rating === null ? colors.starEmpty : colors.container} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>{formatRating(rating)}</Text>
          <Text style={{ fontSize: 14, color: colors.inkSecondary }}>({pluralize(c.review_count ?? 0, "review")})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.container }}>View products</Text>
          <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={14} color={colors.container} weight="semibold" />
        </View>
      </View>
    </Pressable>
  );
}

function BoardFilter({ value, onChange }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", marginHorizontal: 20, padding: 3, borderRadius: 12, borderCurve: "continuous", backgroundColor: colors.segment }}>
      {BOARD_FILTERS.map((f) => {
        const selected = f.value === value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{ flex: 1, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.cell : "transparent", boxShadow: selected ? "0 1px 3px rgba(15,27,42,0.12)" : undefined }}
          >
            <Text style={{ fontSize: 14, fontWeight: selected ? "700" : "600", color: selected ? colors.ink : colors.inkSecondary }}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef(null);
  const [boardY, setBoardY] = useState(0);
  const [board, setBoard] = useState("ALL");
  const [boardAll, setBoardAll] = useState(false);

  const departures = useQuery({ queryKey: keys.departures({ open_only: true }), queryFn: () => api.departures.list({ open_only: true }) });
  const shipping = useQuery({
    queryKey: keys.companies({ company_type: "LOG", ordering: "-average_rating" }),
    queryFn: () => api.companies.list({ company_type: "LOG", ordering: "-average_rating" }),
  });
  // Any supplier, best rated first (Explore used to show verified ones only, so it was often empty).
  const featured = useQuery({
    queryKey: keys.companies({ company_type: "SUP", ordering: "-average_rating" }),
    queryFn: () => api.companies.list({ company_type: "SUP", ordering: "-average_rating" }),
  });

  const products = useQuery({ queryKey: keys.products({ explore: true }), queryFn: () => api.products.list({}) });

  const upcoming = useMemo(
    () => [...(departures.data?.results ?? [])].sort((a, b) => a.departure_date.localeCompare(b.departure_date) || a.dropoff_deadline.localeCompare(b.dropoff_deadline)),
    [departures.data],
  );
  const boardRows = upcoming.filter((d) => board === "ALL" || (board === "SEA" ? d.method === "SEA" : d.method !== "SEA"));
  const shownRows = boardAll ? boardRows : boardRows.slice(0, BOARD_PREVIEW);
  const refreshing = departures.isRefetching || shipping.isRefetching || featured.isRefetching || products.isRefetching;

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120, gap: 26 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            departures.refetch();
            shipping.refetch();
            featured.refetch();
            products.refetch();
          }}
          tintColor={colors.accent}
        />
      }
    >
      {/* Brand, question and search */}
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BrandRow />
          <LanguageButton />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1, color: colors.ink }}>
          What are you importing today?
        </Text>
        <Pressable
          onPress={() => openSearch({ focus: "1" })}
          accessibilityRole="search"
          accessibilityLabel="Search suppliers, products or routes"
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 14, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.fill : colors.cell })}
        >
          <Icon name={{ sf: "magnifyingglass", md: "search" }} size={21} color={colors.inkSecondary} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: colors.inkSecondary }}>
            Suppliers, products, routes
          </Text>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "slider.horizontal.3", md: "tune" }} size={19} color={colors.ink} />
          </View>
        </Pressable>
      </View>

      {/* Category chips, right under the search they refine */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -8 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => openSearch({ q: c.query ?? c.label })}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.steelBorder, backgroundColor: pressed ? colors.steel : colors.cell })}
          >
            <Icon name={c.icon} size={17} color={colors.ink} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Next departure, or a photo banner until there is one */}
      {upcoming[0] ? <NextDepartureTicket departure={upcoming[0]} /> : departures.isPending ? null : <ShippingBanner />}

      {/* Quick links */}
      <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 12 }}>
        {QUICK.map((q) => (
          <QuickTile
            key={q.label}
            label={q.label}
            icon={q.icon}
            onPress={() => (q.board ? scroll.current?.scrollTo({ y: boardY - 12, animated: true }) : q.products ? router.push("/products") : openSearch(q.params))}
          />
        ))}
      </View>

      {/* Products: photo, name, description and price, from every supplier */}
      {!(products.isSuccess && products.data.results.length === 0) && (
        <View style={{ gap: 14 }}>
          <SectionHeader
            title="Products"
            onSeeAll={() => router.push("/products")}
            seeAllLabel={products.data?.count > 4 ? `See all ${products.data.count}` : "See all"}
          />
          {products.isPending ? (
            <Loading />
          ) : products.isError ? (
            <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <ProductGrid products={products.data.results.slice(0, 4)} />
            </View>
          )}
        </View>
      )}

      {/* Shipping companies carousel */}
      {!(shipping.isSuccess && shipping.data.results.length === 0) && (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Top shipping companies" onSeeAll={() => openSearch({ type: "LOG", sort: "-average_rating" })} seeAllLabel={shipping.data?.count > 4 ? `See all ${shipping.data.count}` : "See all"} />
          {shipping.isPending ? (
            <Loading />
          ) : shipping.isError ? (
            <ErrorState message={errorMessage(shipping.error)} onRetry={() => shipping.refetch()} />
          ) : (
            <View style={{ marginHorizontal: 16, paddingHorizontal: 14, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cell }}>
              {shipping.data.results.slice(0, 4).map((c, i, list) => (
                <ShippingRow key={c.id} company={c} last={i === list.length - 1} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Departure board */}
      {upcoming.length > 0 && (
        <View style={{ gap: 14 }} onLayout={(e) => setBoardY(e.nativeEvent.layout.y)}>
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

      {/* Suppliers: description and products up front. Explore shows a few; See all opens the full, searchable list. */}
      {!(featured.isSuccess && featured.data.results.length === 0) && (
        <View style={{ gap: 14 }}>
          <SectionHeader
            title="Suppliers"
            onSeeAll={() => openSearch({ type: "SUP", sort: "-average_rating" })}
            seeAllLabel={featured.data?.count > 4 ? `See all ${featured.data.count}` : "See all"}
          />
          {featured.isPending ? (
            <Loading />
          ) : featured.isError ? (
            <ErrorState message={errorMessage(featured.error)} onRetry={() => featured.refetch()} />
          ) : (
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              {featured.data.results.slice(0, 4).map((c) => (
                <SupplierCard key={c.id} company={c} />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
