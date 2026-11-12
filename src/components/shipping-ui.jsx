import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { deadlineText, departureTitle, METHODS, monthShort, parseDay, relativeDay, soonLabel } from "@/lib/shipping";
import { colors, radius } from "@/lib/theme";
import { Icon } from "./ui";

/**
 * Dashed line across a card. iOS can't draw a dashed border on one side only, so a fully
 * dashed box is clipped down to its top edge.
 */
export function DashedLine({ color = colors.border, style }) {
  return (
    <View style={[{ height: 1, overflow: "hidden" }, style]}>
      <View style={{ height: 2, borderWidth: 1, borderColor: color, borderStyle: "dashed" }} />
    </View>
  );
}

/**
 * The perforation of a ticket: a dashed line with a round notch cut into each edge.
 * `cut` is the colour behind the card; `inset` is the card's horizontal padding.
 */
export function TicketTear({ cut = colors.groupedBackground, line = colors.border, inset = 20, size = 18 }) {
  const notch = { position: "absolute", top: -size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: cut };
  return (
    <View style={{ marginHorizontal: -inset, height: 1, justifyContent: "center" }}>
      <DashedLine color={line} style={{ marginHorizontal: inset }} />
      <View style={[notch, { left: -size / 2 }]} />
      <View style={[notch, { right: -size / 2 }]} />
    </View>
  );
}

/** Small "✈ Air" / "⛴ Sea" chip. */
export function MethodChip({ method }) {
  const m = METHODS[method];
  if (!m) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 30, borderRadius: radius.chip, backgroundColor: m.bg }}>
      <Icon name={m.icon} size={15} color={m.fg} />
      <Text style={{ fontSize: 15, fontWeight: "600", color: m.fg }}>{m.short}</Text>
    </View>
  );
}

/** "• Tomorrow" pill. Amber on navy, orange-tinted on white. */
export function SoonPill({ label, onNavy }) {
  const fg = onNavy ? colors.amberInk : colors.accent;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: onNavy ? colors.amber : colors.accentTint }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onNavy ? colors.accent : colors.accent }} />
      <Text style={{ fontSize: 15, fontWeight: "600", color: fg }}>{label}</Text>
    </View>
  );
}

/** Calendar tile: "NOV" over "12". */
export function DateTile({ value, size = 64 }) {
  return (
    <View style={{ width: size, height: size * 1.1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cell, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.accent, letterSpacing: 0.5 }}>{monthShort(value)}</Text>
      <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: "700", color: colors.label }}>{parseDay(value).getDate()}</Text>
    </View>
  );
}

/**
 * One departure on a board: date tile, "Tomorrow, Thu" with a "Ships tomorrow" badge, the route
 * and the drop-off cut-off. Departures leaving within two days are highlighted.
 * `company` shows the company's name instead of nothing (Explore's board lists many companies).
 */
export function DepartureRow({ departure: d, company, verified, onPress, trailing }) {
  const soon = soonLabel(d.departure_date);
  const day = relativeDay(d.departure_date);
  const weekday = parseDay(d.departure_date).toDateString().slice(0, 3);
  const heading = day === "Tomorrow" || day === "Today" ? `${day}, ${weekday}` : day;
  const closed = d.is_open === false;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: soon && !closed ? colors.accentBorder : colors.border,
        backgroundColor: soon && !closed ? colors.accentSoft : colors.cell,
        opacity: pressed ? 0.85 : closed ? 0.6 : 1,
      })}
    >
      <DateTile value={d.departure_date} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.label }}>{heading}</Text>
          {soon && !closed ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.accent }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onAccent }}>{soon}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          {company && verified ? <Icon name={{ sf: "checkmark.shield.fill", md: "verified_user" }} size={15} color={colors.info} /> : null}
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, color: colors.secondaryLabel }}>
            {company ? `${company} · ` : ""}
            {departureTitle(d)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={{ sf: "clock", md: "schedule" }} size={15} color={soon && !closed ? colors.accent : colors.tertiaryLabel} />
          <Text style={{ fontSize: 15, color: soon && !closed ? colors.accent : colors.tertiaryLabel }}>
            {closed ? "Drop-off closed" : `Drop off by ${deadlineText(d.dropoff_deadline)}`}
          </Text>
        </View>
        {d.note ? (
          <Text numberOfLines={2} style={{ fontSize: 14, color: colors.secondaryLabel, fontStyle: "italic" }}>
            {d.note}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

/** White card used for page sections on the grey background. */
export function Card({ children, style }) {
  return <View style={[{ backgroundColor: colors.cell, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 }, style]}>{children}</View>;
}

/** Grey track with a white selected segment (Brazil | Mexico, Departures | Prices | …). */
export function Segments({ options, value, onChange, large }) {
  const crowded = options.length > 3;
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 6, gap: 4, borderRadius: 16, backgroundColor: colors.fill }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: large ? 52 : 44,
              paddingHorizontal: crowded ? 2 : 8,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? colors.cell : "transparent",
              boxShadow: selected ? "0 1px 4px rgba(13,31,51,0.14)" : undefined,
            }}
          >
            <Text numberOfLines={1} style={{ fontSize: crowded ? 15 : 17, fontWeight: selected ? "700" : "500", color: selected ? colors.label : colors.secondaryLabel }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rounded choice chip: orange outline when selected (Sea freight / General goods). */
export function ChoiceChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 20,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentSoft : pressed ? colors.fill : colors.cell,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text style={{ fontSize: 17, fontWeight: "600", color: selected ? colors.accent : colors.secondaryLabel }}>{label}</Text>
    </Pressable>
  );
}

/** Navy screen header: round back button, optional logo, title and subtitle. */
export function NavyHeader({ insetTop, onBack, logo, title, subtitle, subtitleIcon, subtitleColor, right, children }) {
  return (
    <View style={{ backgroundColor: colors.navy, paddingTop: insetTop + 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: children ? 8 : 16 }}>
        <RoundButton icon={{ sf: "arrow.left", md: "arrow_back" }} label="Back" onPress={onBack} />
        {logo}
        <View style={{ flex: 1, gap: 1 }}>
          <Text numberOfLines={1} accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", color: colors.onNavy }}>
            {title}
          </Text>
          {subtitle ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {subtitleIcon ? <Icon name={subtitleIcon} size={15} color={subtitleColor ?? colors.onNavySecondary} /> : null}
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, color: subtitleColor ?? colors.onNavySecondary }}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** 44pt translucent circle on navy (back, share, favourite). */
export function RoundButton({ icon, label, onPress, active }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      hitSlop={4}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.14)" })}
    >
      <Icon name={icon} size={20} color={colors.onNavy} weight="semibold" />
    </Pressable>
  );
}
