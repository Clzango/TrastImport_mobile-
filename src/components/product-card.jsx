import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { Icon } from "@/components/ui";
import { money } from "@/lib/shipping";
import { colors } from "@/lib/theme";

// The server's product categories and units (apps/models.py ProductCategory / ProductUnit).
export const PRODUCT_CATEGORIES = [
  { value: "ELECTRONICS", label: "Electronics", icon: { sf: "desktopcomputer", md: "devices" } },
  { value: "PHONES", label: "Phones", icon: { sf: "iphone", md: "smartphone" } },
  { value: "HOME", label: "Home & kitchen", icon: { sf: "house", md: "kitchen" } },
  { value: "FURNITURE", label: "Furniture", icon: { sf: "sofa", md: "chair" } },
  { value: "BEAUTY", label: "Beauty", icon: { sf: "sparkles", md: "spa" } },
  { value: "CLOTHING", label: "Clothing", icon: { sf: "tshirt", md: "checkroom" } },
  { value: "SHOES", label: "Shoes", icon: { sf: "shoe", md: "steps" } },
  { value: "TOYS", label: "Toys & gifts", icon: { sf: "gift", md: "toys" } },
  { value: "TOOLS", label: "Tools", icon: { sf: "wrench.and.screwdriver", md: "handyman" } },
  { value: "TEXTILES", label: "Fabrics", icon: { sf: "scissors", md: "content_cut" } },
  { value: "OTHER", label: "Other", icon: { sf: "shippingbox", md: "inventory_2" } },
];
const UNITS = { PIECE: "piece", SET: "set", PAIR: "pair", KG: "kg", METER: "meter", CARTON: "carton" };

export const categoryOf = (value) => PRODUCT_CATEGORIES.find((c) => c.value === value) ?? PRODUCT_CATEGORIES.at(-1);
export const unitLabel = (unit) => UNITS[unit] ?? "unit";

/** The product photo, or a tinted tile with the category icon while there is none. */
export function ProductPhoto({ product, height, radius = 18, style }) {
  if (product.photo) {
    return (
      <Image
        source={{ uri: product.photo }}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`Photo of ${product.name}`}
        style={[{ width: "100%", height, borderRadius: radius, backgroundColor: colors.steel }, style]}
      />
    );
  }
  return (
    <View accessibilityLabel={`${product.name}, no photo yet`} style={[{ width: "100%", height, borderRadius: radius, backgroundColor: colors.steel, alignItems: "center", justifyContent: "center" }, style]}>
      <Icon name={categoryOf(product.category).icon} size={Math.round(height * 0.3)} color={colors.faint} />
    </View>
  );
}

/** Grid tile: photo, name, two lines of description, starting price and the supplier. */
export function ProductCard({ product: p }) {
  const supplier = p.company_info?.name;
  return (
    <Pressable
      onPress={() => router.push(`/product/${p.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${p.name}${p.price_from ? `, from ${money(p.price_from)} per ${unitLabel(p.unit)}` : ""}${supplier ? `, by ${supplier}` : ""}`}
      style={({ pressed }) => ({ flex: 1, gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <ProductPhoto product={p} height={150} />
      <View style={{ gap: 3, paddingHorizontal: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 19, fontWeight: "700", color: colors.ink }}>
          {p.name}
        </Text>
        {p.description ? (
          <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: colors.inkSecondary }}>
            {p.description}
          </Text>
        ) : null}
        <Text style={{ marginTop: 2, fontSize: 16, fontWeight: "800", color: colors.ink }}>
          {p.price_from ? (
            <>
              {money(p.price_from)}
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.inkSecondary }}> / {unitLabel(p.unit)}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.inkSecondary }}>Price on request</Text>
          )}
        </Text>
        {supplier ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: colors.inkSecondary }}>
              {supplier}
            </Text>
            {p.company_info?.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={13} color={colors.teal} />}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Two product cards per row. */
export function ProductGrid({ products, gap = 12 }) {
  const rows = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <View style={{ gap: 18 }}>
      {rows.map((row) => (
        <View key={row[0].id} style={{ flexDirection: "row", gap }}>
          {row.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}
