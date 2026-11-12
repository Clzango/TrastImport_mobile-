import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, ChoiceChip, NavyHeader, Segments } from "@/components/shipping-ui";
import { Text } from "@/components/text";
import { Banner, Button, EmptyState, ErrorState, Field, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { homeCity, METHOD_ORDER, METHODS, money, transitText, UNIT_LABEL } from "@/lib/shipping";
import { colors } from "@/lib/theme";

const CARGO = [
  { value: "GENERAL", label: "General goods" },
  { value: "BATTERY", label: "Has batteries" },
  { value: "LIQUID", label: "Perfume / liquids" },
];

// Kilograms charged per cubic metre of volume (the "volumetric weight" airlines bill on).
const KG_PER_CBM = { AIR: 167, EXPRESS: 200 };

const num = (s) => {
  const n = Number(String(s ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;

function Step({ n, title, children }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.onNavy }}>{n}</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "700", color: colors.label }}>
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

function MethodOption({ price, selected, disabled, note, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentSoft : pressed ? colors.fill : colors.cell,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: selected ? colors.accent : colors.faint, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.accent : "transparent" }}>
        {selected && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.cell }} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.label }}>{METHODS[price.method]?.label ?? price.method}</Text>
        <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>{note ?? transitText(price)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 19, fontWeight: "700", color: colors.label }}>{money(price.price)}</Text>
        <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>{UNIT_LABEL[price.unit] ?? price.unit}</Text>
      </View>
    </Pressable>
  );
}

/** Shipping cost calculator for one shipping company, from its posted prices. */
export default function CalculatorScreen() {
  const id = Number(useLocalSearchParams().id);
  const insets = useSafeAreaInsets();
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const prices = useQuery({ queryKey: keys.prices({ company: id }), queryFn: () => api.prices.list({ company: id }) });

  const [destination, setDestination] = useState(null);
  const [priceId, setPriceId] = useState(null);
  const [cargo, setCargo] = useState("GENERAL");
  const [sizeMode, setSizeMode] = useState("BOX");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [boxes, setBoxes] = useState("1");
  const [cbm, setCbm] = useState("");
  const [weight, setWeight] = useState("");

  const list = useMemo(() => prices.data?.results ?? [], [prices.data]);
  const destinations = useMemo(() => [...new Set(list.map((p) => p.destination))], [list]);
  const dest = destination ?? destinations[0];
  const options = list.filter((p) => p.destination === dest).sort((a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method));
  const batteryBlocked = (p) => cargo === "BATTERY" && !(Number(p.battery_surcharge) > 0);
  const selected = options.find((p) => p.id === priceId && !batteryBlocked(p)) ?? options.find((p) => !batteryBlocked(p));

  // Keep a valid method selected when the destination or cargo type changes.
  useEffect(() => {
    if (selected && selected.id !== priceId) setPriceId(selected.id);
  }, [selected, priceId]);

  const volume = sizeMode === "BOX" ? (num(length) * num(width) * num(height) * Math.max(1, num(boxes) || 1)) / 1_000_000 : num(cbm);
  const actualKg = num(weight);
  let quantity = 0;
  let basis = "";
  if (selected?.unit === "CBM") {
    quantity = volume;
    basis = volume ? `${round2(volume)} CBM` : "";
  } else if (selected) {
    const volumetric = volume * (KG_PER_CBM[selected.method] ?? 167);
    quantity = Math.max(actualKg, volumetric);
    basis = quantity ? `${round2(quantity)} kg charged${volumetric > actualKg ? " (volume weight)" : ""}` : "";
  }
  const rate = selected ? Number(selected.price) + (cargo === "BATTERY" ? Number(selected.battery_surcharge) || 0 : 0) : 0;
  const total = round2(quantity * rate);
  const needsWeight = selected && selected.unit === "KG";

  const quote = useMutation({
    mutationFn: async () => {
      const conversation = await api.chat.open(id);
      const from = homeCity(company.data) || "China";
      const size =
        sizeMode === "BOX"
          ? `${num(boxes) || 1} box(es), ${num(length)} × ${num(width)} × ${num(height)} cm (${round2(volume)} CBM)`
          : `${round2(volume)} CBM`;
      const draft = [
        "Hello, I'd like a shipping quote.",
        "",
        `Route: ${from} → ${dest}`,
        `Method: ${METHODS[selected.method]?.label ?? selected.method} (${transitText(selected)})`,
        `Cargo: ${CARGO.find((c) => c.value === cargo)?.label}`,
        `Size: ${size}`,
        actualKg ? `Weight: ${actualKg} kg` : null,
        total ? `Calculator estimate: ${money(total)}` : null,
      ]
        .filter((l) => l !== null)
        .join("\n");
      return { conversation, draft };
    },
    onSuccess: ({ conversation, draft }) => router.replace({ pathname: "/chat/[id]", params: { id: String(conversation.id), draft } }),
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace(`/company/${id}`));
  const header = <NavyHeader insetTop={insets.top} onBack={back} title="Shipping cost calculator" subtitle={company.data?.name ?? " "} />;

  if (prices.isPending || company.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
        <StatusBar style="light" />
        {header}
        <Loading />
      </View>
    );
  }
  if (prices.isError || company.isError) {
    const error = prices.error ?? company.error;
    return (
      <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
        <StatusBar style="light" />
        {header}
        <ErrorState message={errorMessage(error)} onRetry={() => (prices.refetch(), company.refetch())} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.groupedBackground }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      {header}
      {list.length === 0 ? (
        <EmptyState
          icon={{ sf: "dollarsign.circle", md: "payments" }}
          title="No prices listed yet"
          message={`${company.data.name} hasn't posted prices. Message them for a quote.`}
          action={<Button title="Message" onPress={() => api.chat.open(id).then((c) => router.replace(`/chat/${c.id}`))} />}
        />
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <Step n={1} title="Route">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name={{ sf: "mappin", md: "location_on" }} size={18} color={colors.secondaryLabel} />
                <Text style={{ fontSize: 17, color: colors.secondaryLabel }}>From {homeCity(company.data) || "China"} to</Text>
              </View>
              <Segments options={destinations.map((d) => ({ value: d, label: d }))} value={dest} onChange={setDestination} large />
            </Step>

            <Step n={2} title="Shipping method">
              <View style={{ gap: 12 }}>
                {options.map((p) => (
                  <MethodOption key={p.id} price={p} selected={selected?.id === p.id} disabled={batteryBlocked(p)} note={batteryBlocked(p) ? "Doesn't take batteries" : undefined} onPress={() => setPriceId(p.id)} />
                ))}
              </View>
            </Step>

            <Step n={3} title="What are you shipping?">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {CARGO.map((c) => (
                  <ChoiceChip key={c.value} label={c.label} selected={cargo === c.value} onPress={() => setCargo(c.value)} />
                ))}
              </View>
              {cargo === "BATTERY" && selected && Number(selected.battery_surcharge) > 0 ? (
                <Banner tone="info" message={`Batteries add ${money(selected.battery_surcharge)} ${UNIT_LABEL[selected.unit]} on this method.`} />
              ) : null}
              {cargo === "LIQUID" ? <Banner tone="info" message="Perfume and liquids need the company's approval. The estimate below is the general rate; they'll confirm the final price." /> : null}
            </Step>

            <Step n={4} title="Cargo size">
              <Segments
                options={[
                  { value: "BOX", label: "Box dimensions" },
                  { value: "CBM", label: "I know the CBM" },
                ]}
                value={sizeMode}
                onChange={setSizeMode}
              />
              {sizeMode === "BOX" ? (
                <>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {[
                      ["Length (cm)", length, setLength],
                      ["Width (cm)", width, setWidth],
                      ["Height (cm)", height, setHeight],
                    ].map(([label, value, set]) => (
                      <View key={label} style={{ flex: 1 }}>
                        <Field inset={false} label={label} value={value} onChangeText={set} keyboardType="decimal-pad" placeholder="0" />
                      </View>
                    ))}
                  </View>
                  <Field inset={false} label="Number of boxes" value={boxes} onChangeText={setBoxes} keyboardType="number-pad" placeholder="1" />
                </>
              ) : (
                <Field inset={false} label="Volume (CBM)" value={cbm} onChangeText={setCbm} keyboardType="decimal-pad" placeholder="e.g. 0.96" />
              )}
              {needsWeight ? <Field inset={false} label="Total weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 45" /> : null}
              {basis ? <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>{basis}</Text> : null}
            </Step>

            <Text style={{ fontSize: 14, lineHeight: 20, color: colors.tertiaryLabel, paddingHorizontal: 4 }}>
              An estimate from {company.data.name}'s posted prices. The final price is confirmed by the company in chat.
            </Text>
          </ScrollView>

          <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: process.env.EXPO_OS === "web" ? 14 : Math.max(insets.bottom, 12), backgroundColor: colors.cell, borderTopWidth: 1, borderTopColor: colors.separator }}>
            <Banner message={quote.error ? errorMessage(quote.error) : null} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ fontSize: 16, color: colors.secondaryLabel }}>
                  {selected ? `${METHODS[selected.method]?.label}${transitText(selected) ? `, ${transitText(selected)}` : ""}` : "Pick a method"}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 34, fontWeight: "700", color: colors.label }}>
                  {total ? money(total) : "—"}
                </Text>
              </View>
              <Button title="Send quote request" disabled={!selected} loading={quote.isPending} onPress={() => quote.mutate()} style={{ paddingHorizontal: 24, minHeight: 60 }} />
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
