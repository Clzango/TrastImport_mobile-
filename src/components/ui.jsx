import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { Children, Fragment, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { colors, radius } from "@/lib/theme";
import { Text, TextInput } from "./text";

export function haptic(kind = "light") {
  if (process.env.EXPO_OS !== "ios") return;
  if (kind === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
}

export function Icon({ name, size = 20, color = colors.label, weight }) {
  return (
    <SymbolView
      name={{ ios: name.sf, android: name.md, web: name.md }}
      tintColor={color}
      size={size}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}

// ---------------------------------------------------------------------------
// Layout

/** Light-grey scroll container used by most screens. */
export function Screen({ children, contentContainerStyle, ...props }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={[{ padding: 20, gap: 20, paddingBottom: 48 }, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

/** Big page title used on tab roots, which have no navigation bar. */
export function PageTitle({ children }) {
  return (
    <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, color: colors.label }}>
      {children}
    </Text>
  );
}

/** The orange "TI" brand tile. */
export function BrandMark({ size = 32 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, borderCurve: "continuous", backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: size * 0.4, letterSpacing: 0.3 }}>TI</Text>
    </View>
  );
}

function SectionHeader({ children }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.secondaryLabel, marginHorizontal: 4 }}>{children}</Text>
  );
}

/** Bordered white card of rows with an uppercase header, as in the Profile design. */
export function Section({ header, footer, children, style }) {
  const items = Children.toArray(children);
  return (
    <View style={[{ gap: 8 }, style]}>
      {header ? <SectionHeader>{header}</SectionHeader> : null}
      {items.length > 0 && (
        <View style={{ backgroundColor: colors.cell, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
          {items.map((child, i) => (
            <Fragment key={i}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: 16 }} />}
              {child}
            </Fragment>
          ))}
        </View>
      )}
      {typeof footer === "string" ? <Text style={{ fontSize: 13, color: colors.secondaryLabel, marginHorizontal: 4, lineHeight: 18 }}>{footer}</Text> : footer}
    </View>
  );
}

/** Full-width white band with hairline borders, as in the Company Details design. */
export function Panel({ title, action, children, style }) {
  return (
    <View style={[{ backgroundColor: colors.cell, paddingHorizontal: 20, paddingVertical: 20, gap: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }, style]}>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 24 }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "700", color: colors.label }}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Rounded square with an orange icon, used at the start of list rows. */
export function IconTile({ name }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: 10, borderCurve: "continuous", backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
      <Icon name={name} size={18} color={colors.accent} />
    </View>
  );
}

export function Row({ title, subtitle, value, icon, iconStyle = "tile", onPress, chevron = !!onPress, locked, destructive, tint, accessory, selectable, inset = true }) {
  const titleColor = destructive ? colors.danger : tint ? colors.accent : colors.label;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill : "transparent" })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: inset ? 16 : 0, minHeight: 56, paddingVertical: 8 }}>
        {icon ? iconStyle === "tile" ? <IconTile name={icon} /> : <Icon name={icon} size={20} color={colors.label} /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text selectable={selectable} style={{ fontSize: 15, fontWeight: "600", color: titleColor }}>{title}</Text>
          {subtitle ? <Text selectable={selectable} style={{ fontSize: 13, lineHeight: 18, color: colors.secondaryLabel }}>{subtitle}</Text> : null}
        </View>
        {value ? <Text selectable={selectable} numberOfLines={1} style={{ fontSize: 14, color: colors.secondaryLabel, maxWidth: "55%", textAlign: "right" }}>{value}</Text> : null}
        {accessory}
        {locked ? (
          <Icon name={{ sf: "lock", md: "lock" }} size={16} color={colors.tertiaryLabel} />
        ) : chevron ? (
          <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={16} color={colors.tertiaryLabel} weight="semibold" />
        ) : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Forms

/** Label above a bordered input; errors render under the field, as the API spec asks. */
export function Field({ label, error, labelAction, revealable, icon, inset = true, multiline, secureTextEntry, style, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.label : colors.inputBorder;

  return (
    <View style={{ gap: 6, paddingHorizontal: inset ? 16 : 0, paddingVertical: inset ? 12 : 0 }}>
      {(label || labelAction) && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.label }}>{label}</Text>
          {labelAction}
        </View>
      )}
      <View>
        <TextInput
          placeholderTextColor={colors.tertiaryLabel}
          selectionColor={colors.accent}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={(e) => (setFocused(true), onFocus?.(e))}
          onBlur={(e) => (setFocused(false), onBlur?.(e))}
          style={[
            {
              minHeight: multiline ? 110 : 52,
              paddingHorizontal: 16,
              paddingLeft: icon ? 46 : 16,
              paddingRight: revealable ? 52 : 16,
              paddingVertical: multiline ? 14 : 0,
              borderWidth: 1.5,
              borderColor,
              borderRadius: radius.button,
              borderCurve: "continuous",
              backgroundColor: colors.inputBackground,
              fontSize: 16,
              color: colors.label,
              textAlignVertical: multiline ? "top" : "center",
              boxShadow: focused ? "0 0 0 3px rgba(23,36,58,0.12)" : undefined,
              outlineWidth: 0,
            },
            style,
          ]}
          {...props}
        />
        {icon && (
          <View style={{ position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", pointerEvents: "none" }}>
            <Icon name={icon} size={19} color={focused ? colors.accent : colors.tertiaryLabel} />
          </View>
        )}
        {revealable && (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 4, top: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={revealed ? { sf: "eye.slash", md: "visibility_off" } : { sf: "eye", md: "visibility" }} size={20} color={colors.secondaryLabel} />
          </Pressable>
        )}
      </View>
      {error ? <Text selectable style={{ fontSize: 13, color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}

export function Banner({ message, tone = "danger" }) {
  if (!message) return null;
  const fg = tone === "danger" ? colors.danger : tone === "success" ? colors.success : colors.info;
  const bg = tone === "danger" ? colors.dangerSoft : tone === "success" ? colors.successSoft : colors.infoSoft;
  const icon =
    tone === "danger" ? { sf: "exclamationmark.triangle", md: "warning" } : tone === "success" ? { sf: "checkmark.circle", md: "check_circle" } : { sf: "info.circle", md: "info" };
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.cell, borderCurve: "continuous", backgroundColor: bg, alignItems: "flex-start" }}>
      <Icon name={icon} size={18} color={fg} />
      <Text selectable style={{ flex: 1, fontSize: 14, color: colors.bodyText, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "filled",
  icon,
  trailingIcon,
  style,
}
) {
  const filled = variant === "filled";
  const accentOutline = variant === "accentOutline";
  const outlined = variant === "outline" || variant === "tinted" || variant === "destructive" || accentOutline;
  const fg = filled ? colors.onAccent : variant === "destructive" ? colors.danger : variant === "plain" || accentOutline ? colors.accent : colors.label;
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: filled ? (pressed ? colors.accentPressed : colors.accent) : outlined ? (pressed ? colors.fill : colors.cell) : "transparent",
          borderWidth: outlined ? 1.5 : 0,
          borderColor: variant === "destructive" ? colors.dangerSoft : accentOutline ? colors.accent : colors.inputBorder,
          minHeight: 52,
          borderRadius: radius.button,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 18,
          opacity: disabled ? 0.45 : variant === "plain" && pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} weight="semibold" /> : null}
      {!loading && <Text style={{ fontSize: filled ? 16 : 15, fontWeight: "700", color: fg }}>{title}</Text>}
      {!loading && trailingIcon ? <Icon name={trailingIcon} size={18} color={fg} weight="semibold" /> : null}
    </Pressable>
  );
}

export function HeaderButton({ title, onPress, disabled, bold }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={12} style={{ paddingHorizontal: process.env.EXPO_OS === "web" ? 16 : 6, opacity: disabled ? 0.35 : 1 }}>
      <Text style={{ fontSize: 16, color: colors.accent, fontWeight: bold ? "700" : "500" }}>{title}</Text>
    </Pressable>
  );
}

/** 44×44 icon button for headers and cards. */
export function IconButton({ icon, label, onPress, color = colors.label, active, activeIcon }) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.fill : "transparent" })}
    >
      <Icon name={active && activeIcon ? activeIcon : icon} size={20} color={active ? colors.accent : color} />
    </Pressable>
  );
}

/** Round filter chip. Active chips turn dark navy, as in the Explore design. */
export function Chip({ label, icon, active, onPress, trailingIcon }) {
  const fg = active ? colors.onAccent : colors.label;
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 32,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.label : colors.inputBorder,
        backgroundColor: active ? colors.label : pressed ? colors.fill : colors.cell,
      })}
    >
      {icon && <Icon name={icon} size={14} color={fg} weight="semibold" />}
      <Text style={{ fontSize: 13, fontWeight: active ? "600" : "500", color: fg }}>{label}</Text>
      {trailingIcon && <Icon name={trailingIcon} size={14} color={fg} weight="semibold" />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Ratings & badges

function StarGlyph({ filled, size }) {
  if (process.env.EXPO_OS === "ios") {
    return <Icon name={{ sf: "star.fill", md: "star" }} size={size} color={filled ? colors.star : colors.starEmpty} />;
  }
  // Material's "star" symbol draws as an outline on web, so use a text star there.
  return <Text style={{ fontSize: size * 1.1, lineHeight: size * 1.25, color: filled ? colors.star : colors.starEmpty }}>★</Text>;
}

export function Stars({ rating, size = 14 }) {
  const value = rating ?? 0;
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }} accessibilityLabel={rating === null ? "No ratings yet" : `${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarGlyph key={i} filled={rating !== null && value >= i - 0.25} size={size} />
      ))}
    </View>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: 5, now: value }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          hitSlop={6}
          onPress={() => {
            haptic();
            onChange(i);
          }}
          accessibilityLabel={`${i} star${i > 1 ? "s" : ""}`}
        >
          <StarGlyph filled={i <= value} size={38} />
        </Pressable>
      ))}
    </View>
  );
}

/** Blue "Verified" chip. Blue is kept for trust signals so it never reads as a brand-orange button. */
export function VerifiedBadge({ label = "Verified" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.infoSoft, borderRadius: 6, paddingLeft: 4, paddingRight: 8, paddingVertical: 2 }}>
      <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={14} color="#2F6FE4" />
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#2F6FE4" }}>{label}</Text>
    </View>
  );
}

export function Pill({ label, tone = "neutral" }) {
  const fg = tone === "accent" ? colors.accentInk : tone === "success" ? colors.success : tone === "danger" ? colors.danger : colors.secondaryLabel;
  const bg = tone === "accent" ? colors.accentTint : tone === "success" ? colors.successSoft : tone === "danger" ? colors.dangerSoft : colors.fill;
  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: bg }}>
      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: fg }}>{label}</Text>
    </View>
  );
}

export function Tag({ label }) {
  return (
    <View style={{ backgroundColor: colors.fill, borderRadius: radius.chip, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.secondaryLabel }}>{label}</Text>
    </View>
  );
}

export function Avatar({ text, size = 40 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
      {text ? (
        <Text style={{ fontSize: size * 0.36, fontWeight: "700", color: colors.secondaryLabel }}>{text}</Text>
      ) : (
        <Icon name={{ sf: "person", md: "person" }} size={size * 0.5} color={colors.secondaryLabel} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// States

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.groupedBackground }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={28} color={colors.secondaryLabel} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.label, textAlign: "center" }}>{title}</Text>
      {message ? <Text style={{ fontSize: 15, color: colors.secondaryLabel, textAlign: "center", lineHeight: 22 }}>{message}</Text> : null}
      {action ? <View style={{ marginTop: 8, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon={{ sf: "wifi.exclamationmark", md: "wifi_off" }}
      title="Couldn't load"
      message={message}
      action={onRetry ? <Button title="Try Again" variant="outline" onPress={onRetry} /> : undefined}
    />
  );
}
