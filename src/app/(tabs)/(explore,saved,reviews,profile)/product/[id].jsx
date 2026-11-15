import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo } from "@/components/company-card";
import { categoryOf, ProductPhoto, unitLabel } from "@/components/product-card";
import { Text } from "@/components/text";
import { Banner, Button, ErrorState, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { keys } from "@/lib/query-keys";
import { money } from "@/lib/shipping";
import { colors } from "@/lib/theme";

function CircleButton({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.steel : "rgba(255,255,255,0.94)", boxShadow: "0 2px 8px rgba(15,27,42,0.15)" })}>
      <Icon name={icon} size={18} color={colors.ink} weight="semibold" />
    </Pressable>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.4, color: colors.ink }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { status } = useAuth();
  const product = useQuery({ queryKey: keys.product(id), queryFn: () => api.products.get(id) });
  const p = product.data;
  const chat = useMutation({
    mutationFn: (draft) => api.chat.open(p.company).then((conversation) => ({ conversation, draft })),
    onSuccess: ({ conversation, draft }) => router.push({ pathname: "/chat/[id]", params: { id: String(conversation.id), ...(draft ? { draft } : {}) } }),
  });

  if (product.isPending) return <Loading />;
  if (product.isError) return <ErrorState message={errorMessage(product.error)} onRetry={() => product.refetch()} />;

  const unit = unitLabel(p.unit);
  const tiers = p.price_tiers ?? [];
  const company = p.company_info ?? { id: p.company, name: "Supplier" };
  const quoteDraft = `Hello, I'd like a quote for "${p.name}". Quantity: `;
  const openChat = (draft) => (status === "signedIn" ? chat.mutate(draft) : router.push("/login"));

  // On Android the native tab bar already sits below this screen and owns the system-nav inset,
  // so adding insets.bottom again leaves a gap above the tabs.
  const bottomInset = process.env.EXPO_OS === "android" ? 0 : insets.bottom;
  const photoHeight = Math.round(insets.top + 340);
  // Solid strip behind the status bar, faded in once the photo scrolls away, so text never runs under the clock.
  const statusBarOpacity = scrollY.interpolate({ inputRange: [photoHeight - insets.top - 48, photoHeight - insets.top], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <View style={{ flex: 1, backgroundColor: colors.cell }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 96 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <View>
          <ProductPhoto product={p} height={photoHeight} radius={0} />
          <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
            <CircleButton icon={{ sf: "chevron.left", md: "arrow_back_ios_new" }} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          </View>
        </View>

        <View style={{ padding: 20, gap: 22 }}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.steel }}>
              <Icon name={categoryOf(p.category).icon} size={15} color={colors.inkSecondary} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.inkSecondary }}>{categoryOf(p.category).label}</Text>
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 30, fontWeight: "800", letterSpacing: -0.7, color: colors.ink }}>
              {p.name}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>
              {p.price_from ? (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.inkSecondary }}>From </Text>
                  {money(p.price_from)}
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.inkSecondary }}> / {unit}</Text>
                </>
              ) : (
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.inkSecondary }}>Price on request</Text>
              )}
            </Text>
            <Text style={{ fontSize: 14, color: colors.inkSecondary }}>
              Minimum order: <Text style={{ fontWeight: "700", color: colors.ink }}>{p.moq} {p.moq === 1 ? unit : `${unit}s`}</Text>
            </Text>
          </View>

          <Pressable onPress={() => router.push(`/company/${company.id}`)} accessibilityRole="link" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.groupedBackground : colors.cell })}>
            <CompanyLogo company={company} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: "800", color: colors.ink }}>{company.name}</Text>
                {company.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={15} color={colors.teal} />}
              </View>
              <Text style={{ fontSize: 13, color: colors.inkSecondary }}>See the supplier and all its products</Text>
            </View>
            <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={15} color={colors.faint} weight="semibold" />
          </Pressable>

          {tiers.length > 0 && (
            <Section title={`Price per ${unit}`}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {tiers.slice(0, 3).map((t, i) => (
                  <View key={t.min_quantity} style={{ flex: 1, padding: 10, gap: 2, borderRadius: 14, borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? colors.ink : colors.border }}>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink }}>{money(t.price)}</Text>
                    <Text style={{ fontSize: 12, color: colors.inkSecondary }}>
                      {t.max_quantity ? `${t.min_quantity}–${t.max_quantity}` : `${t.min_quantity}+`} {unit}s
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {p.description ? (
            <Section title="Description">
              <Text selectable style={{ fontSize: 15, lineHeight: 23, color: colors.bodyText }}>{p.description}</Text>
            </Section>
          ) : null}

          {p.features?.length > 0 && (
            <Section title="Features">
              <View style={{ gap: 10 }}>
                {p.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft }}>
                      <Icon name={{ sf: "checkmark", md: "check" }} size={15} color={colors.tealInk} weight="bold" />
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, color: colors.ink }}>{f}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {p.specs?.length > 0 && (
            <Section title="Specifications">
              <View>
                {p.specs.map((s, i) => (
                  <View key={`${s.name}-${i}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderBottomWidth: i === p.specs.length - 1 ? 0 : 1, borderBottomColor: colors.separator }}>
                    <Text style={{ fontSize: 14, color: colors.inkSecondary }}>{s.name}</Text>
                    <Text style={{ flexShrink: 1, fontSize: 14, fontWeight: "700", color: colors.ink, textAlign: "right" }}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}
        </View>
      </Animated.ScrollView>

      <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.cell, opacity: statusBarOpacity, boxShadow: "0 1px 0 rgba(15,27,42,0.08)" }} />

      {/* Docked action bar: price on the left, chat and quote on the right, sitting on the tab bar. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: bottomInset + 10, backgroundColor: colors.cell, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Banner message={chat.error ? errorMessage(chat.error) : null} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {p.price_from ? (
              <>
                <Text style={{ fontSize: 12, color: colors.inkSecondary }}>From</Text>
                <Text numberOfLines={1}>
                  <Text style={{ fontSize: 19, fontWeight: "800", color: colors.ink }}>{money(p.price_from)}</Text>
                  <Text style={{ fontSize: 13, color: colors.inkSecondary }}> / {unit}</Text>
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.inkSecondary }}>Price on request</Text>
            )}
          </View>
          <Pressable
            onPress={() => openChat(undefined)}
            disabled={chat.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Message ${company.name}`}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, borderCurve: "continuous", borderWidth: 1.5, borderColor: colors.steelBorder, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.steel : colors.cell })}
          >
            <Icon name={{ sf: "ellipsis.message", md: "chat" }} size={21} color={colors.ink} />
          </Pressable>
          <Button title="Request quote" variant="ink" loading={chat.isPending && !!chat.variables} onPress={() => openChat(quoteDraft)} style={{ minHeight: 48, paddingHorizontal: 20 }} />
        </View>
      </View>
    </View>
  );
}
