import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContainerPanel } from "@/components/container-panel";
import { Text } from "@/components/text";
import { haptic, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";

// Three marketing slides: worldwide trade, verified suppliers, quotes and departures.
// The previous version of this screen is kept in .design-backup/welcome.before-redesign.jsx.

const SLIDES = [
  {
    key: "world",
    title: "Buy and ship between any two countries",
    message: "From Lisbon to Maputo or Shenzhen to São Paulo, find suppliers and carriers wherever you trade.",
    light: true,
  },
  {
    key: "suppliers",
    title: "Find verified suppliers in any country",
    message: "Compare makers in Portugal, Brazil, China and beyond by product, rating and certificates.",
    light: false,
  },
  {
    key: "quotes",
    title: "Compare quotes and book the next departure",
    message: "Get prices in chat from carriers on your route, see cut-off times and pick what fits your budget.",
    light: true,
  },
];

// City pins baked into onboarding-globe.png, as fractions of the image (see the design canvas).
const CITIES = [
  { name: "Lisbon", x: 0.2894, y: 0.2509, side: "left" },
  { name: "Istanbul", x: 0.5059, y: 0.2435, side: "right" },
  { name: "Dubai", x: 0.6853, y: 0.3482, side: "right" },
  { name: "Shenzhen", x: 0.9121, y: 0.3326, side: "above" },
  { name: "Lagos", x: 0.315, y: 0.4918, side: "left" },
  { name: "Luanda", x: 0.3874, y: 0.6129, side: "left" },
  { name: "São Paulo", x: 0.1047, y: 0.6891, side: "below" },
  { name: "Maputo", x: 0.5321, y: 0.7365, side: "right", highlight: true },
];

const CATEGORIES = [
  { label: "Electronics", icon: { sf: "desktopcomputer", md: "devices" }, bg: colors.tealSoft, fg: colors.tealInk },
  { label: "Textiles", icon: { sf: "tshirt", md: "apparel" }, bg: "#FFF1E6", fg: "#8A3006" },
  { label: "Machinery", icon: { sf: "gearshape.2", md: "precision_manufacturing" }, bg: "#E8ECF8", fg: "#2E3F8F" },
  { label: "Furniture", icon: { sf: "sofa", md: "chair" }, bg: "#FFF6DB", fg: "#6B4E00" },
  { label: "Packaging", icon: { sf: "shippingbox", md: "inventory_2" }, bg: colors.steel, fg: colors.bodyText },
  { label: "Auto parts", icon: { sf: "car", md: "directions_car" }, bg: "#FDEBEC", fg: "#9B1C2C" },
];

const cardShadow = "0 16px 36px rgba(15,27,42,0.18), 0 2px 6px rgba(15,27,42,0.06)";

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

function Chip({ icon, label }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
      <Icon name={icon} size={16} color="#9CCBFF" />
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onAccent }}>{label}</Text>
    </View>
  );
}

/** Slide 1: the blue globe with routes between cities, on a night-blue background. */
function WorldVisual({ size, float }) {
  return (
    <LinearGradient colors={["#17406F", "#0B2545", "#061A33"]} locations={[0, 0.55, 1]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: size, height: size, transform: [{ translateY: float }] }}>
        <Image
          source={require("@/assets/images/onboarding-globe.png")}
          contentFit="contain"
          style={{ width: size, height: size }}
          accessibilityLabel="World map with trade routes between Lisbon, Istanbul, Dubai, Shenzhen, Lagos, Luanda, Maputo and São Paulo"
        />
        {CITIES.map((c) => {
          const x = c.x * size;
          const y = c.y * size;
          const place =
            c.side === "left"
              ? { right: size - x + 9, top: y - 12 }
              : c.side === "right"
                ? { left: x + 9, top: y - 12 }
                : c.side === "above"
                  ? { right: size - x - 14, top: y - 36 }
                  : { left: x - 14, top: y + 10 };
          return (
            <View
              key={c.name}
              accessible={false}
              style={{ position: "absolute", ...place, height: 24, paddingHorizontal: 8, borderRadius: 999, justifyContent: "center", backgroundColor: c.highlight ? colors.cargo : colors.cell, boxShadow: "0 4px 12px rgba(0,8,20,0.35)" }}
            >
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "800", color: c.highlight ? colors.cargoInk : colors.ink }}>
                {c.name}
              </Text>
            </View>
          );
        })}
      </Animated.View>
      <View style={{ position: "absolute", bottom: 20, flexDirection: "row", gap: 6 }}>
        <Chip icon={{ sf: "building.2", md: "factory" }} label="Suppliers" />
        <Chip icon={{ sf: "ferry", md: "directions_boat" }} label="Sea" />
        <Chip icon={{ sf: "airplane", md: "flight" }} label="Air" />
        <Chip icon={{ sf: "box.truck", md: "local_shipping" }} label="Express" />
      </View>
    </LinearGradient>
  );
}

/** Slide 2: product categories and a verified supplier card. */
function SuppliersVisual({ topInset }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.steel, paddingTop: topInset + 64, paddingHorizontal: 20, gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CATEGORIES.map((c) => (
          <View key={c.label} style={{ width: "31.2%", height: 92, borderRadius: 20, borderCurve: "continuous", backgroundColor: colors.cell, alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 4px 12px rgba(15,27,42,0.06)" }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
              <Icon name={c.icon} size={22} color={c.fg} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{c.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginHorizontal: 14, padding: 16, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.cell, boxShadow: cardShadow, transform: [{ rotate: "-3deg" }], gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ContainerPanel style={{ width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.onAccent }}>TX</Text>
          </ContainerPanel>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>Textile maker</Text>
              <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={17} color={colors.teal} />
            </View>
            <Text style={{ fontSize: 13, color: colors.inkSecondary }}>Porto, Portugal</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {["Verified business", "Samples", "Ships worldwide"].map((t) => (
            <View key={t} style={{ height: 28, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.tealSoft, justifyContent: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.tealInk }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Quote({ icon, mode, transit, unit, highlight, rotate }) {
  return (
    <View style={{ padding: 16, borderRadius: 22, borderCurve: "continuous", backgroundColor: colors.cell, boxShadow: cardShadow, transform: [{ rotate }] }}>
      {highlight && (
        <View style={{ position: "absolute", top: -12, right: 14, flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.cargo }}>
          <Icon name={{ sf: "bolt.fill", md: "bolt" }} size={14} color={colors.cargoInk} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: colors.cargoInk }}>Fastest</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: highlight ? colors.accentSoft : colors.steel, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={23} color={highlight ? colors.container : colors.ink} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>{mode} to Maputo</Text>
          <Text style={{ fontSize: 13, color: colors.inkSecondary }}>{transit}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.inkSecondary }}>{unit}</Text>
      </View>
    </View>
  );
}

/** Slide 3: air and sea quotes side by side, the next cut-off, and a quote request. */
function QuotesVisual({ topInset }) {
  return (
    <ContainerPanel style={{ flex: 1, paddingTop: topInset + 64, paddingHorizontal: 24, gap: 14 }}>
      <Quote icon={{ sf: "airplane", md: "flight" }} mode="Air" transit="Days, door to door" unit="per kg" highlight rotate="-2deg" />
      <Quote icon={{ sf: "ferry", md: "directions_boat" }} mode="Sea" transit="Weeks, port to port" unit="per m³" rotate="1.5deg" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, borderCurve: "continuous", backgroundColor: colors.ink, boxShadow: cardShadow }}>
        <Icon name={{ sf: "clock.fill", md: "schedule" }} size={22} color={colors.cargo} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.onAccent }}>See every cut-off time</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>Drop off on time, ship on the next departure</Text>
        </View>
      </View>
    </ContainerPanel>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  // Leave room under the visual for the title, message and the buttons, which sit over the
  // bottom of the screen: on small phones (Galaxy S24 and similar) a fixed 60% left the text under them.
  const compact = height < 820 || width < 380;
  const bottomRoom = (compact ? 330 : 360) + insets.bottom;
  const visualHeight = Math.round(Math.min(Math.max(height - bottomRoom, 300), 560));
  const globeSize = Math.min(width - 24, visualHeight - insets.top - 110);
  const [active, setActive] = useState(0);
  const pager = useRef(null);
  const float = useRef(new Animated.Value(0)).current;
  const last = active === SLIDES.length - 1;

  // The globe drifts gently up and down; off when the system asks for reduced motion.
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -8, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduceMotion]);

  const goTo = (index) => {
    haptic();
    setActive(index);
    pager.current?.scrollTo({ x: width * index, y: 0, animated: !reduceMotion });
  };
  const onSettled = (e) => setActive(Math.max(0, Math.min(SLIDES.length - 1, Math.round(e.nativeEvent.contentOffset.x / width))));
  const light = SLIDES[active].light;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cell }}>
      <StatusBar style={light ? "light" : "dark"} />
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettled}
        accessibilityLabel="Welcome. Swipe left or right to see what TrastImport does."
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={{ width, flex: 1 }}>
            <View style={{ height: visualHeight, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, borderCurve: "continuous", overflow: "hidden" }}>
              {slide.key === "world" ? <WorldVisual size={globeSize} float={float} /> : slide.key === "suppliers" ? <SuppliersVisual topInset={insets.top} /> : <QuotesVisual topInset={insets.top} />}
            </View>
            <View style={{ paddingHorizontal: 24, paddingTop: compact ? 20 : 26, gap: compact ? 8 : 12, maxWidth: 560 }}>
              <Text accessibilityRole="header" style={{ fontSize: compact ? 27 : 32, lineHeight: compact ? 30 : 35, fontWeight: "800", letterSpacing: compact ? -0.7 : -1.1, color: colors.ink }}>
                {slide.title}
              </Text>
              <Text style={{ fontSize: compact ? 15 : 16, lineHeight: compact ? 21 : 24, color: colors.inkSecondary, maxWidth: 340 }}>{slide.message}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Brand and Skip, over the slides */}
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 12, left: 24, right: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: light ? colors.cell : colors.container, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "sailboat.fill", md: "sailing" }} size={18} color={light ? colors.container : colors.onAccent} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", letterSpacing: -0.4, color: light ? colors.onAccent : colors.ink }}>TrastImport</Text>
        </View>
        {!last && (
          <Pressable onPress={() => router.push("/login")} accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, paddingHorizontal: 6, justifyContent: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: light ? colors.onAccent : colors.ink }}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Progress and actions */}
      <View style={{ position: "absolute", left: 24, right: 24, bottom: Math.max(compact ? 16 : 24, insets.bottom + 10) }}>
        {last ? (
          <View style={{ gap: compact ? 10 : 14 }}>
            <Dots active={active} onPress={goTo} center />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={() => router.push("/login")} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, height: compact ? 50 : 56, borderRadius: 14, borderCurve: "continuous", borderWidth: 1.5, borderColor: colors.steelBorder, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.steel : colors.cell })}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>Log in</Text>
              </Pressable>
              <Pressable onPress={() => (haptic(), router.push("/signup"))} accessibilityRole="button" style={({ pressed }) => ({ flex: 1.4, height: compact ? 50 : 56, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.accentPressed : colors.container, boxShadow: "0 8px 20px rgba(201,71,11,0.3)" })}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.onAccent }}>Get started</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: 9 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.inkSecondary }}>
                Step {active + 1} of {SLIDES.length}
              </Text>
              <Dots active={active} onPress={goTo} />
            </View>
            <Pressable onPress={() => goTo(active + 1)} accessibilityRole="button" accessibilityLabel="Next" style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: colors.steelBorder, alignItems: "center", justifyContent: "center" }}>
              {({ pressed }) => (
                <View style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.navyRaised : colors.ink, boxShadow: "0 8px 20px rgba(15,27,42,0.25)" }}>
                  <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={24} color={colors.onAccent} weight="semibold" />
                </View>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function Dots({ active, onPress, center }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 5, alignSelf: center ? "center" : "flex-start" }}>
      {SLIDES.map((s, i) => (
        <Pressable key={s.key} onPress={() => onPress(i)} accessibilityRole="tab" accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`} accessibilityState={{ selected: i === active }} hitSlop={10}>
          <View style={{ width: i === active ? 34 : 18, height: 6, borderRadius: 999, backgroundColor: i <= active ? colors.ink : colors.steelBorder }} />
        </Pressable>
      ))}
    </View>
  );
}
