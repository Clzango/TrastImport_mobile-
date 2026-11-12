import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Wordmark } from "@/components/auth-ui";
import { Text } from "@/components/text";
import { haptic, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";

const SLIDES = [
  {
    eyebrow: "SUPPLIER NETWORK",
    title: "Find trusted suppliers.",
    message: "Explore company profiles, products and reviews from businesses around the world.",
    icon: { sf: "building.2.fill", md: "factory" },
    tint: colors.successSoft,
    ink: colors.success,
  },
  {
    eyebrow: "SHIPPING, SIMPLIFIED",
    title: "Plan every shipment.",
    message: "Compare routes, services, departures and prices before you reach out.",
    icon: { sf: "ferry.fill", md: "directions_boat" },
    tint: colors.seaSoft,
    ink: colors.sea,
  },
  {
    eyebrow: "GLOBAL CONNECTIONS",
    title: "Build business worldwide.",
    message: "Chat with business owners and grow your network across borders.",
    icon: { sf: "globe.americas.fill", md: "public" },
    tint: colors.accentSoft,
    ink: colors.accent,
  },
];

/** Animated, swipeable first screen shown to signed-out users. */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 720;
  const heroHeight = Math.max(250, Math.min(390, height * (compact ? 0.38 : 0.42)));
  const pageWidth = Math.max(260, Math.min(width - 48, 512));
  const logoBlockHeight = 26 * 2.42 + 8;
  const artworkScale = Math.max(0.55, Math.min(1, (heroHeight - insets.top - 14 - logoBlockHeight - 16) / 200));
  const artworkSize = 200 * artworkScale;

  const [activeSlide, setActiveSlide] = useState(0);
  const pager = useRef(null);
  const logoIn = useRef(new Animated.Value(0)).current;
  const artIn = useRef(new Animated.Value(0)).current;
  const copyIn = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      Animated.timing(logoIn, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(artIn, { toValue: 1, damping: 14, stiffness: 115, useNativeDriver: true }),
      Animated.timing(copyIn, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    const orbitLoop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true }));
    entrance.start();
    orbitLoop.start();
    return () => {
      entrance.stop();
      orbitLoop.stop();
    };
  }, [artIn, copyIn, logoIn, orbit]);

  const orbitRotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const goToSlide = (index) => {
    if (index === activeSlide) return;
    haptic();
    setActiveSlide(index);
    pager.current?.scrollTo({ x: pageWidth * index, y: 0, animated: true });
  };
  const onPageSettled = (event) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth)));
    if (next !== activeSlide) haptic();
    setActiveSlide(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[colors.navy, colors.navyRaised, "#214F70"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: heroHeight + 28, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" }}
      >
        <View style={{ position: "absolute", width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,0.035)", top: -100, right: -65 }} />
        <View style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", bottom: -120, left: -60 }} />
      </LinearGradient>

      <View style={{ height: heroHeight, paddingTop: insets.top + 14, paddingHorizontal: 24, alignItems: "center" }}>
        <Animated.View style={{ alignItems: "center", opacity: logoIn, transform: [{ translateY: logoIn.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
          <Wordmark size={26} onDark />
        </Animated.View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }}>
          <Animated.View style={{ width: artworkSize, height: artworkSize, alignItems: "center", justifyContent: "center", opacity: artIn, transform: [{ scale: artIn.interpolate({ inputRange: [0, 1], outputRange: [0.72 * artworkScale, artworkScale] }), translateY: artIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
            <View style={{ position: "absolute", width: 186, height: 186, borderRadius: 93, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }} />
            <View style={{ position: "absolute", width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)" }} />
            <LinearGradient
              colors={["#4294C4", "#1C5F8D", colors.navy]}
              start={{ x: 0.15, y: 0.1 }}
              end={{ x: 0.85, y: 1 }}
              style={{ width: 116, height: 116, borderRadius: 58, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.38)", boxShadow: "0 12px 30px rgba(0,0,0,0.24)" }}
            >
              <Icon name={{ sf: "globe.americas.fill", md: "public" }} size={68} color="#FFFFFF" />
            </LinearGradient>

            <Animated.View style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1.5, borderColor: "rgba(246,178,107,0.82)", transform: [{ rotate: orbitRotation }] }}>
              <View style={{ position: "absolute", top: 16, right: 11, width: 42, height: 42, borderRadius: 15, backgroundColor: colors.accent, borderWidth: 2, borderColor: "rgba(255,255,255,0.78)", alignItems: "center", justifyContent: "center", boxShadow: "0 5px 12px rgba(0,0,0,0.24)" }}>
                <Icon name={{ sf: "shippingbox.fill", md: "inventory_2" }} size={21} color="#FFFFFF" />
              </View>
              <View style={{ position: "absolute", bottom: 8, left: 14, width: 42, height: 42, borderRadius: 15, backgroundColor: colors.cell, borderWidth: 2, borderColor: "rgba(255,255,255,0.78)", alignItems: "center", justifyContent: "center", boxShadow: "0 5px 12px rgba(0,0,0,0.24)" }}>
                <Icon name={{ sf: "ferry.fill", md: "directions_boat" }} size={22} color={colors.navy} />
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 0, marginTop: -24, backgroundColor: colors.groupedBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: compact ? 20 : 24, paddingBottom: Math.max(16, insets.bottom + 12) }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Animated.View style={{ opacity: copyIn, transform: [{ translateY: copyIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, lineHeight: 15, fontWeight: "700", letterSpacing: 1, color: colors.accentInk }}>TRADE, CONNECT, GROW</Text>
                <Text accessibilityLabel={`Page ${activeSlide + 1} of ${SLIDES.length}`} style={{ fontSize: 12, fontWeight: "700", color: colors.tertiaryLabel, fontVariant: ["tabular-nums"] }}>0{activeSlide + 1} / 0{SLIDES.length}</Text>
              </View>

              <ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={pageWidth}
                onMomentumScrollEnd={onPageSettled}
                style={{ width: pageWidth, flexGrow: 0 }}
                accessibilityLabel="Welcome features. Swipe left or right to explore."
              >
                {SLIDES.map((slide, index) => (
                  <View key={slide.eyebrow} style={{ width: pageWidth, paddingHorizontal: 2, paddingBottom: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 11 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: slide.tint, alignItems: "center", justifyContent: "center" }}>
                        <Icon name={slide.icon} size={17} color={slide.ink} />
                      </View>
                      <Text style={{ fontSize: 11, lineHeight: 15, fontWeight: "700", letterSpacing: 0.75, color: slide.ink }}>{slide.eyebrow}</Text>
                    </View>
                    <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.55, color: colors.navy, marginBottom: 8 }}>
                      {slide.title}
                    </Text>
                    <Text style={{ fontSize: 15, lineHeight: 22, color: colors.secondaryLabel }}>
                      {slide.message}
                    </Text>
                    {index === 0 ? <View style={{ height: 2 }} /> : null}
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </View>

          <View style={{ gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View accessibilityRole="tablist" style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                {SLIDES.map((slide, index) => (
                  <Pressable
                    key={slide.eyebrow}
                    onPress={() => goToSlide(index)}
                    accessibilityRole="tab"
                    accessibilityLabel={`Show slide ${index + 1}: ${slide.eyebrow.toLowerCase()}`}
                    accessibilityState={{ selected: activeSlide === index }}
                    hitSlop={8}
                    style={{ minWidth: 26, minHeight: 32, justifyContent: "center" }}
                  >
                    <View style={{ width: activeSlide === index ? 24 : 7, height: 7, borderRadius: 999, backgroundColor: activeSlide === index ? colors.accent : colors.border }} />
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Icon name={{ sf: "arrow.left.and.right", md: "swap_horiz" }} size={14} color={colors.tertiaryLabel} />
                <Text style={{ fontSize: 12, color: colors.tertiaryLabel }}>Swipe to explore</Text>
              </View>
            </View>

            <Pressable
              onPress={() => (haptic(), router.push("/signup"))}
              accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 54, borderRadius: 999, backgroundColor: pressed ? colors.accentPressed : colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 5px 14px rgba(194,69,12,0.22)" })}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: colors.onAccent }}>Get started</Text>
              <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={18} color={colors.onAccent} weight="bold" />
            </Pressable>

            <Text style={{ textAlign: "center", fontSize: 14, lineHeight: 20, color: colors.secondaryLabel }}>
              Already have an account?{" "}
              <Text onPress={() => router.push("/login")} accessibilityRole="link" style={{ fontWeight: "800", color: colors.accentInk, textDecorationLine: "underline" }}>
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
