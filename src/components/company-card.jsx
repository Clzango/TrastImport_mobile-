import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { companyTypeLabel, formatRating, initials, pluralize, ratingValue } from "@/lib/format";
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

/** Short category line: first product for suppliers, first route for shipping companies. */
export function companyCategory(company) {
  const first = (s) => s.split(/[,;\n]/)[0]?.trim();
  if (company.company_type === "LOG") {
    const route = first(company.routes_serviced);
    return route ? `Shipping · ${route}` : companyTypeLabel.LOG;
  }
  return first(company.main_products) || companyTypeLabel.SUP;
}

export function companyLocation(company) {
  const a = company.addresses[0];
  return a ? [a.city, a.country].filter(Boolean).join(", ") : "";
}

export function CompanyCard({ company }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(company.id);
  const rating = ratingValue(company.average_rating);
  const location = companyLocation(company);
  const open = () => router.push(`/company/${company.id}`);

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${company.name}, ${formatRating(rating)} stars, ${pluralize(company.review_count, "review")}`}
      style={({ pressed }) => ({
        backgroundColor: colors.cell,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: 16,
        gap: 14,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
        <CompanyLogo company={company} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text numberOfLines={2} style={{ fontSize: 16, lineHeight: 21, fontWeight: "700", color: colors.label }}>
            {company.name}
          </Text>
          {location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name={{ sf: "mappin", md: "location_on" }} size={14} color={colors.secondaryLabel} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: colors.secondaryLabel }}>{location}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            <Pill label={companyCategory(company)} />
            {company.is_verified && <VerifiedBadge />}
          </View>
        </View>
        <View style={{ marginTop: -10, marginRight: -10 }}>
          <IconButton
            icon={{ sf: "bookmark", md: "bookmark_border" }}
            activeIcon={{ sf: "bookmark.fill", md: "bookmark" }}
            active={saved}
            color={colors.secondaryLabel}
            label={saved ? "Remove from saved" : "Save company"}
            onPress={() => toggle(company)}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 16, color: rating === null ? colors.starEmpty : colors.star }}>★</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.label, fontVariant: ["tabular-nums"] }}>{formatRating(rating)}</Text>
          <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>· {pluralize(company.review_count, "review")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accent }}>View Company</Text>
          <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={16} color={colors.accent} weight="semibold" />
        </View>
      </View>
    </Pressable>
  );
}
