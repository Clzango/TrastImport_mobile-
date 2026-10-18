import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { companyTypeLabel, formatRating, initials, pluralize, ratingValue, countryName } from "@/lib/format";
import { useSaved } from "@/lib/saved";
import { colors, logoTint, radius } from "@/lib/theme";
import { Icon, IconButton, Pill, VerifiedBadge } from "./ui";

export function CompanyLogo({ company, size = 52 }) {
  const tint = logoTint(company.id);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        borderCurve: "continuous",
        backgroundColor: tint.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.33, fontWeight: "800", color: tint.ink }}>{initials(company.name)}</Text>
    </View>
  );
}

/** Splits a free-text list on commas, semicolons and new lines, but not inside brackets. */
function splitList(text) {
  const items = [];
  let depth = 0;
  let current = "";
  for (const ch of text ?? "") {
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n")) {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items.map((t) => t.trim()).filter(Boolean);
}

/**
 * A shipping company's services with transit times: the API's `services` list when it has one,
 * else lines of routes_serviced such as "Sea Freight: 20–40 days" or "Air Freight (3-7 days)".
 */
export function companyServices(company) {
  if (Array.isArray(company.services) && company.services.length) {
    return company.services.map((s) => (typeof s === "string" ? { name: s } : { name: s.name, transit: s.transit_time }));
  }
  return splitList(company.routes_serviced).map((line) => {
    const m = line.match(/^(.*?)\s*(?:[:|–—-]\s+|\()\s*(\d[\d\s–-]*\s*(?:days?|weeks?|hrs?|hours?))\)?\s*$/i);
    return m ? { name: m[1].trim(), transit: m[2].trim() } : { name: line };
  });
}

/** Short category line: first product for suppliers, first service for shipping companies. */
export function companyCategory(company) {
  if (company.company_type === "LOG") {
    const service = companyServices(company)[0]?.name;
    return service ? `Shipping · ${service}` : companyTypeLabel.LOG;
  }
  return splitList(company.main_products)[0] || companyTypeLabel.SUP;
}

export function companyLocation(company) {
  const a = company.addresses[0];
  return a ? [a.city, countryName(a.country_code, a.country)].filter(Boolean).join(", ") : "";
}

/** Products for suppliers, service names for shipping companies, as short tags. */
export function companyTags(company, max = 6) {
  const tags = company.company_type === "LOG" ? companyServices(company).map((s) => s.name) : splitList(company.main_products);
  return tags.slice(0, max);
}

/** Heart toggle for Favorites. */
export function FavoriteButton({ company, color = colors.tertiaryLabel }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(company.id);
  return (
    <IconButton
      icon={{ sf: "heart", md: "favorite_border" }}
      activeIcon={{ sf: "heart.fill", md: "favorite" }}
      active={saved}
      color={color}
      label={saved ? "Remove from favorites" : "Add to favorites"}
      onPress={() => toggle(company)}
    />
  );
}

export function CompanyCard({ company }) {
  const rating = ratingValue(company.average_rating);
  const location = companyLocation(company);
  const tags = companyTags(company, 2);
  const open = () => router.push(`/company/${company.id}`);

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${company.name}, ${formatRating(rating)} stars, ${pluralize(company.review_count, "review")}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 14,
        backgroundColor: colors.cell,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: 14,
        boxShadow: "0 1px 3px rgba(23,36,58,0.05)",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <CompanyLogo company={company} size={56} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text numberOfLines={2} style={{ fontSize: 16, lineHeight: 21, fontWeight: "700", color: colors.label, paddingRight: 28 }}>
          {company.name}
        </Text>
        {company.is_verified && <VerifiedBadge />}
        {location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name={{ sf: "mappin", md: "location_on" }} size={13} color={colors.secondaryLabel} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: colors.secondaryLabel }}>{location}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {tags.length ? tags.map((t) => <Pill key={t} label={t} />) : <Pill label={companyCategory(company)} />}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 15, color: rating === null ? colors.starEmpty : colors.star }}>★</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.label, fontVariant: ["tabular-nums"] }}>{formatRating(rating)}</Text>
          <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>({pluralize(company.review_count, "review")})</Text>
        </View>
      </View>
      <View style={{ position: "absolute", top: 4, right: 4 }}>
        <FavoriteButton company={company} />
      </View>
    </Pressable>
  );
}
