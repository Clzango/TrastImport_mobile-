import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Wordmark } from "@/components/auth-ui";
import { Text } from "@/components/text";
import { haptic, Icon } from "@/components/ui";
import { photos } from "@/lib/photos";
import { colors } from "@/lib/theme";

const FEATURES = [
  { icon: { sf: "checkmark.shield", md: "verified_user" }, label: "Trusted\nSuppliers" },
  { icon: { sf: "ferry", md: "directions_boat" }, label: "Reliable\nShipping" },
  { icon: { sf: "globe", md: "language" }, label: "Global\nOpportunities" },
];

/** First screen when signed out. */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#B84C09" }}>
      <StatusBar style="light" />
      {/* The photo stops above the text so the sun and ship stay visible. */}
      <Image source={photos.welcome} contentFit="cover" contentPosition="bottom" style={{ position: "absolute", top: 0, right: 0, left: 0, height: "72%" }} accessible={false} />
      {/* Dark at the top for the logo, orange at the bottom for the text, like the design. */}
      <LinearGradient
        colors={["rgba(30,12,2,0.55)", "rgba(30,12,2,0)", "rgba(184,76,9,0)", "rgba(184,76,9,1)"]}
        locations={[0, 0.3, 0.5, 0.74]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View style={{ flex: 1, paddingTop: insets.top + 48, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Wordmark size={34} onDark />
          <Text style={{ fontSize: 17, lineHeight: 24, color: "rgba(255,255,255,0.92)", textAlign: "center" }}>
            Connect Suppliers & Shipping{"\n"}Companies Worldwide
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 }}>Global trade made easier.</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.9)" }}>
            Find trusted suppliers, reliable shipping companies and new business opportunities across the globe.
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24 }}>
          {FEATURES.map((f) => (
            <View key={f.label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Icon name={f.icon} size={24} color="#FFFFFF" />
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", color: "#FFFFFF", textAlign: "center" }}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => (haptic(), router.push("/signup"))}
          accessibilityRole="button"
          style={({ pressed }) => ({ marginTop: 28, minHeight: 56, borderRadius: 999, backgroundColor: pressed ? colors.accentSoft : "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 })}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.accent }}>Get Started</Text>
          <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={18} color={colors.accent} weight="bold" />
        </Pressable>
        <Text style={{ marginTop: 18, textAlign: "center", fontSize: 15, color: "rgba(255,255,255,0.9)" }}>
          Already have an account?{" "}
          <Text onPress={() => router.push("/login")} accessibilityRole="link" style={{ fontWeight: "800", color: "#FFFFFF", textDecorationLine: "underline" }}>
            Log in
          </Text>
        </Text>
      </View>
    </View>
  );
}
