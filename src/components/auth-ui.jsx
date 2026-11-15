import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { haptic, Icon } from "@/components/ui";
import { ContainerPanel } from "@/components/container-panel";
import { colors, radius } from "@/lib/theme";

// Pieces shared by the Welcome, Log in and Sign up screens.

/**
 * Log in / Sign up frame: the orange container panel carries the back button, logo, title and
 * subtitle; the form sits on a white sheet that slides up over it. `footer` stays at the bottom.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.container }} behavior="padding">
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <ContainerPanel style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 64, gap: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            {router.canGoBack() ? (
              <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" }}>
                <Icon name={{ sf: "chevron.left", md: "arrow_back_ios_new" }} size={18} color={colors.onAccent} weight="semibold" />
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colors.cell, alignItems: "center", justifyContent: "center" }}>
                <Icon name={{ sf: "sailboat.fill", md: "sailing" }} size={17} color={colors.container} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: colors.onAccent }}>TrastImport</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ gap: 6, width: "100%", maxWidth: 560, alignSelf: "center" }}>
            <Text accessibilityRole="header" style={{ fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1, color: colors.onAccent }}>
              {title}
            </Text>
            {subtitle ? <Text style={{ fontSize: 16, lineHeight: 22, color: colors.onAccent }}>{subtitle}</Text> : null}
          </View>
        </ContainerPanel>
        <View style={{ flexGrow: 1, marginTop: -32, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderCurve: "continuous", backgroundColor: colors.cell, boxShadow: "0 -10px 30px rgba(60,15,0,0.18)" }}>
          <View style={{ flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingTop: 28, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
            {children}
            <View style={{ flex: 1, minHeight: 24 }} />
            {footer}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const brandGradient = ["#7A2E03", "#C4520A", "#F07A26"];

/** The supplied TrastImport logo, scaled for welcome and authentication screens. */
export function Wordmark({ size = 30, onDark }) {
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="TrastImport — Find Suppliers. Connect. Ship Worldwide."
      style={onDark ? { padding: 4, borderRadius: 13, backgroundColor: "#FFFFFF" } : undefined}
    >
      <Image
        source={require("@/assets/images/trastimport-logo.png")}
        contentFit="contain"
        accessible={false}
        style={{ width: size * 9.8, height: size * 2.42 }}
      />
    </View>
  );
}

/** Logo block at the top of Log in / Sign up / code screens. */
export function AuthHeader() {
  return (
    <View style={{ gap: 8, alignItems: "flex-start" }}>
      <Wordmark size={28} />
    </View>
  );
}

/** Freight motifs drawn over the gradient, standing in for a photo. Fills its parent. */
export function FreightArt({ scale = 1 }) {
  const tint = "rgba(255,255,255,0.9)";
  const faint = "rgba(255,255,255,0.22)";
  return (
    <View style={{ ...absoluteFill, overflow: "hidden", pointerEvents: "none" }}>
      <View style={{ position: "absolute", right: -40 * scale, top: -30 * scale }}>
        <Icon name={{ sf: "globe.americas.fill", md: "public" }} size={220 * scale} color="rgba(255,255,255,0.08)" />
      </View>
      <View style={{ position: "absolute", right: 36 * scale, top: 40 * scale, transform: [{ rotate: "-12deg" }] }}>
        <Icon name={{ sf: "airplane", md: "flight" }} size={34 * scale} color={tint} />
      </View>
      <View style={{ position: "absolute", left: 24 * scale, bottom: 64 * scale }}>
        <Icon name={{ sf: "ferry.fill", md: "directions_boat" }} size={84 * scale} color={tint} />
      </View>
      <View style={{ position: "absolute", left: 128 * scale, bottom: 72 * scale, flexDirection: "row", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <Icon key={i} name={{ sf: "shippingbox.fill", md: "inventory_2" }} size={26 * scale} color={faint} />
        ))}
      </View>
    </View>
  );
}

const absoluteFill = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

/** Orange header with a curved white edge at the bottom, from the Log in / Sign up design. */
export function AuthHero({ height = 220, back }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: height + insets.top, overflow: "hidden" }}>
      <StatusBar style="light" />
      <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={absoluteFill} />
      <FreightArt />
      {/* The page's rounded top edge, overlapping the gradient. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36, borderCurve: "continuous", backgroundColor: colors.cell }} />
      {back && router.canGoBack() && (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ position: "absolute", top: insets.top + 12, left: 16, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name={{ sf: "chevron.left", md: "arrow_back" }} size={18} color="#FFFFFF" weight="semibold" />
        </Pressable>
      )}
    </View>
  );
}

export function FullScreenGradient({ children }) {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={["#5C2202", "#A9450A", "#E8701F"]} locations={[0, 0.55, 1]} style={absoluteFill} />
      {children}
    </View>
  );
}

export function OrDivider({ label = "or continue with" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

export function Checkbox({ label, value, onChange }) {
  return (
    <Pressable
      onPress={() => (haptic(), onChange(!value))}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderCurve: "continuous",
          borderWidth: 1.5,
          borderColor: value ? colors.accent : colors.inputBorder,
          backgroundColor: value ? colors.accent : colors.cell,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value && <Icon name={{ sf: "checkmark", md: "check" }} size={14} color={colors.onAccent} weight="bold" />}
      </View>
      <Text style={{ fontSize: 14, color: colors.bodyText }}>{label}</Text>
    </Pressable>
  );
}

/** Large selectable card with an icon tile, title, description and a radio dot. */
export function ChoiceCard({ icon, title, description, selected, onPress }) {
  return (
    <Pressable
      onPress={() => (haptic(), onPress())}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 14,
        padding: 18,
        borderRadius: radius.card,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentSoft : colors.cell,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 14, borderCurve: "continuous", backgroundColor: selected ? colors.accentTint : colors.fill, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={26} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.label }}>{title}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.secondaryLabel }}>{description}</Text>
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.accent : colors.inputBorder, alignItems: "center", justifyContent: "center" }}>
        {selected && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent }} />}
      </View>
    </Pressable>
  );
}
