import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo } from "@/components/company-card";
import { DateField } from "@/components/date-field";
import { ReviewCard } from "@/components/review-card";
import { Card, ChoiceChip, NavyHeader, Segments } from "@/components/shipping-ui";
import { Text } from "@/components/text";
import { Banner, Button, EmptyState, ErrorState, Field, haptic, Icon, Loading, Row, Section } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pickDocument } from "@/lib/files";
import { addressTypeLabel, formatDate, pluralize } from "@/lib/format";
import { formErrors } from "@/lib/form-errors";
import { invalidateShipping, keys } from "@/lib/query-keys";
import { deadlineText, departureTitle, isoDay, METHOD_ORDER, METHODS, money, relativeDay, shortDate, transitText, UNIT_LABEL } from "@/lib/shipping";
import { colors } from "@/lib/theme";

const TABS = [
  { value: "departures", label: "Departures" },
  { value: "prices", label: "Prices" },
  { value: "listing", label: "Listing" },
];

function confirm(title, message, onConfirm) {
  if (process.env.EXPO_OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

function TrashButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.fill : colors.cell })}>
      <Icon name={{ sf: "trash", md: "delete_outline" }} size={20} color={colors.label} />
    </Pressable>
  );
}

function Label({ children }) {
  return <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>{children}</Text>;
}

/** Destinations the company ships to, as {value: code or name, label: name}. */
function useDestinations(company) {
  return useMemo(() => {
    const names = company?.ships_to ?? [];
    const codes = company?.ships_to_codes ?? [];
    return names.map((name, i) => ({ value: codes[i] || name, label: name }));
  }, [company]);
}

function DestinationPicker({ destinations, value, onChange }) {
  if (destinations.length === 0) {
    return <Field inset={false} value={value} onChangeText={onChange} placeholder="Country, e.g. Brazil" autoCapitalize="words" />;
  }
  if (destinations.length <= 3) return <Segments options={destinations} value={value} onChange={onChange} large />;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {destinations.map((d) => (
        <ChoiceChip key={d.value} label={d.label} selected={value === d.value} onPress={() => onChange(d.value)} />
      ))}
    </View>
  );
}

function MethodPicker({ value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {METHOD_ORDER.map((m) => (
        <ChoiceChip key={m} label={METHODS[m].label} selected={value === m} onPress={() => onChange(m)} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

function DeparturesTab({ company }) {
  const queryClient = useQueryClient();
  const destinations = useDestinations(company);
  const [destination, setDestination] = useState(destinations[0]?.value ?? "");
  const [method, setMethod] = useState("SEA");
  const [date, setDate] = useState(null);
  const [cutoffDate, setCutoffDate] = useState(null);
  const [cutoffTime, setCutoffTime] = useState(() => {
    const t = new Date();
    t.setHours(17, 0, 0, 0);
    return t;
  });
  const [note, setNote] = useState("");

  const departures = useQuery({
    queryKey: keys.departures({ company: company.id, open_only: true }),
    queryFn: () => api.departures.list({ company: company.id, open_only: true }),
  });
  const scheduled = [...(departures.data?.results ?? [])].sort((a, b) => a.departure_date.localeCompare(b.departure_date));

  const deadline = cutoffDate && cutoffTime ? new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), cutoffDate.getDate(), cutoffTime.getHours(), cutoffTime.getMinutes()) : null;
  const deadlineAfterDeparture = date && deadline && deadline > new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59);
  const ready = destination && method && date && deadline && !deadlineAfterDeparture;

  const publish = useMutation({
    mutationFn: () => api.departures.create(company.id, { destination, method, departure_date: isoDay(date), dropoff_deadline: deadline.toISOString(), note: note.trim() }),
    onSuccess: () => {
      haptic("success");
      setDate(null);
      setCutoffDate(null);
      setNote("");
      invalidateShipping(queryClient, company.id);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => api.departures.remove(id),
    onSuccess: () => invalidateShipping(queryClient, company.id),
  });
  const errors = formErrors(publish.error, ["destination", "method", "departure_date", "dropoff_deadline", "note"]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <Card>
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700", color: colors.label }}>
            Post a departure
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 21, color: colors.secondaryLabel }}>Buyers see it on your page and the Explore departure board, so they can send goods in time.</Text>
        </View>
        <Banner message={errors.banner} />
        {publish.isSuccess && !publish.isPending ? <Banner tone="success" message="Departure published." /> : null}

        <View style={{ gap: 8 }}>
          <Label>Destination</Label>
          <DestinationPicker destinations={destinations} value={destination} onChange={setDestination} />
          {destinations.length === 0 ? <Text style={{ fontSize: 14, color: colors.tertiaryLabel }}>Add the countries you ship to in Edit listing to pick them here.</Text> : null}
          {errors.field.destination ? <Text style={{ fontSize: 14, color: colors.danger }}>{errors.field.destination}</Text> : null}
        </View>

        <View style={{ gap: 8 }}>
          <Label>Shipping method</Label>
          <MethodPicker value={method} onChange={setMethod} />
        </View>

        <DateField label="Departure date" value={date} onChange={setDate} minimumDate={today} />
        {errors.field.departure_date ? <Text style={{ fontSize: 14, color: colors.danger, marginTop: -8 }}>{errors.field.departure_date}</Text> : null}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <DateField label="Drop-off deadline" value={cutoffDate} onChange={setCutoffDate} minimumDate={today} defaultValue={date ?? undefined} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Time" mode="time" value={cutoffTime} onChange={setCutoffTime} />
          </View>
        </View>
        {deadlineAfterDeparture ? <Text style={{ fontSize: 14, color: colors.danger, marginTop: -8 }}>The drop-off deadline must be on or before the departure date.</Text> : null}
        {errors.field.dropoff_deadline ? <Text style={{ fontSize: 14, color: colors.danger, marginTop: -8 }}>{errors.field.dropoff_deadline}</Text> : null}

        <Field inset={false} label="Note for clients (optional)" value={note} onChangeText={setNote} multiline placeholder="e.g. Space is limited, book early" style={{ minHeight: 90 }} />

        <Button title="Publish departure" disabled={!ready} loading={publish.isPending} onPress={() => publish.mutate()} />
      </Card>

      <Card>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700", color: colors.label }}>
          Scheduled departures ({scheduled.length})
        </Text>
        <Banner message={remove.error ? errorMessage(remove.error) : null} />
        {departures.isPending ? (
          <Loading />
        ) : departures.isError ? (
          <ErrorState message={errorMessage(departures.error)} onRetry={() => departures.refetch()} />
        ) : scheduled.length === 0 ? (
          <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>Nothing scheduled. Departures disappear from here once their drop-off deadline passes.</Text>
        ) : (
          scheduled.map((d) => (
            <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.separator }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 19, fontWeight: "700", color: colors.label }}>
                  {shortDate(d.departure_date)}
                  <Text style={{ fontSize: 16, fontWeight: "500", color: colors.accent }}> · {relativeDay(d.departure_date)}</Text>
                </Text>
                <Text style={{ fontSize: 17, color: colors.secondaryLabel }}>{departureTitle(d)}</Text>
                <Text style={{ fontSize: 16, color: colors.tertiaryLabel }}>Drop off by {deadlineText(d.dropoff_deadline)}</Text>
              </View>
              <TrashButton label={`Delete ${departureTitle(d)} on ${shortDate(d.departure_date)}`} onPress={() => confirm("Delete departure?", `${departureTitle(d)} on ${shortDate(d.departure_date)} will be removed.`, () => remove.mutate(d.id))} />
            </View>
          ))
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------

const emptyPrice = (destination) => ({ id: null, destination, method: "SEA", unit: "CBM", price: "", min: "", max: "", battery: "" });

function PricesTab({ company }) {
  const queryClient = useQueryClient();
  const destinations = useDestinations(company);
  const [form, setForm] = useState(() => emptyPrice(destinations[0]?.value ?? ""));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const prices = useQuery({ queryKey: keys.prices({ company: company.id }), queryFn: () => api.prices.list({ company: company.id }) });
  const list = prices.data?.results ?? [];

  const save = useMutation({
    mutationFn: () => {
      const data = {
        destination: form.destination,
        method: form.method,
        unit: form.unit,
        price: form.price.replace(",", "."),
        transit_days_min: Number(form.min) || 0,
        transit_days_max: Number(form.max) || Number(form.min) || 0,
        battery_surcharge: form.battery ? form.battery.replace(",", ".") : null,
      };
      return form.id ? api.prices.update(company.id, form.id, data) : api.prices.create(company.id, data);
    },
    onSuccess: () => {
      haptic("success");
      setForm(emptyPrice(form.destination));
      invalidateShipping(queryClient, company.id);
    },
  });
  const remove = useMutation({ mutationFn: (id) => api.prices.remove(company.id, id), onSuccess: () => invalidateShipping(queryClient, company.id) });
  const errors = formErrors(save.error, ["destination", "method", "unit", "price", "transit_days_min", "transit_days_max", "battery_surcharge"]);
  const ready = form.destination && form.price && Number(form.price.replace(",", ".")) > 0 && form.min;

  const edit = (p) =>
    setForm({
      id: p.id,
      destination: (destinations.find((d) => d.label === p.destination)?.value ?? p.destination_code) || p.destination,
      method: p.method,
      unit: p.unit,
      price: String(p.price),
      min: String(p.transit_days_min ?? ""),
      max: String(p.transit_days_max ?? ""),
      battery: p.battery_surcharge ? String(p.battery_surcharge) : "",
    });

  return (
    <>
      <Card>
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700", color: colors.label }}>
            {form.id ? "Edit price" : "Add a price"}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 21, color: colors.secondaryLabel }}>Buyers use these in the shipping cost calculator on your page.</Text>
        </View>
        <Banner message={errors.banner} />

        <View style={{ gap: 8 }}>
          <Label>Destination</Label>
          <DestinationPicker destinations={destinations} value={form.destination} onChange={(destination) => set({ destination })} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>Shipping method</Label>
          <MethodPicker value={form.method} onChange={(method) => set({ method, unit: method === "SEA" ? "CBM" : "KG" })} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>Charged</Label>
          <Segments
            options={[
              { value: "KG", label: "Per kg" },
              { value: "CBM", label: "Per CBM" },
            ]}
            value={form.unit}
            onChange={(unit) => set({ unit })}
          />
        </View>
        <Field inset={false} label="Price (US$)" value={form.price} onChangeText={(price) => set({ price })} keyboardType="decimal-pad" placeholder={form.unit === "KG" ? "e.g. 6.50" : "e.g. 180"} error={errors.field.price} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field inset={false} label="Transit from (days)" value={form.min} onChangeText={(min) => set({ min })} keyboardType="number-pad" placeholder="3" error={errors.field.transit_days_min} />
          </View>
          <View style={{ flex: 1 }}>
            <Field inset={false} label="To (days)" value={form.max} onChangeText={(max) => set({ max })} keyboardType="number-pad" placeholder="5" error={errors.field.transit_days_max} />
          </View>
        </View>
        <Field
          inset={false}
          label="Battery surcharge (optional)"
          value={form.battery}
          onChangeText={(battery) => set({ battery })}
          keyboardType="decimal-pad"
          placeholder={`Extra US$ ${UNIT_LABEL[form.unit]}; leave empty if not accepted`}
          error={errors.field.battery_surcharge}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {form.id ? <Button title="Cancel" variant="outline" onPress={() => setForm(emptyPrice(form.destination))} style={{ flex: 1 }} /> : null}
          <Button title={form.id ? "Save changes" : "Add price"} disabled={!ready} loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 2 }} />
        </View>
      </Card>

      <Card>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700", color: colors.label }}>
          Your prices ({list.length})
        </Text>
        <Banner message={remove.error ? errorMessage(remove.error) : null} />
        {prices.isPending ? (
          <Loading />
        ) : prices.isError ? (
          <ErrorState message={errorMessage(prices.error)} onRetry={() => prices.refetch()} />
        ) : list.length === 0 ? (
          <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>No prices yet. Without prices, buyers can only ask for a quote in chat.</Text>
        ) : (
          list.map((p) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.separator }}>
              <Pressable onPress={() => edit(p)} accessibilityRole="button" accessibilityHint="Edit this price" style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.label }}>
                  {METHODS[p.method]?.label ?? p.method} to {p.destination}
                </Text>
                <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>
                  {money(p.price)} {UNIT_LABEL[p.unit]} · {transitText(p)}
                  {p.battery_surcharge ? ` · +${money(p.battery_surcharge)} batteries` : ""}
                </Text>
              </Pressable>
              <TrashButton label={`Delete ${METHODS[p.method]?.label} to ${p.destination}`} onPress={() => confirm("Delete price?", `${METHODS[p.method]?.label} to ${p.destination} will be removed.`, () => remove.mutate(p.id))} />
            </View>
          ))
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------

function ListingTab({ company: c }) {
  const reviews = useInfiniteQuery({
    queryKey: keys.companyReviews(c.id),
    queryFn: ({ pageParam }) => api.companies.reviews(c.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * 20 : undefined),
  });
  const allReviews = reviews.data?.pages.flatMap((p) => p.results) ?? [];
  const unanswered = allReviews.filter((r) => !r.reply).length;

  return (
    <>
      <Section header="Listing">
        <Row icon={{ sf: "pencil", md: "edit" }} title="Edit listing" subtitle="Description, contact details, products and routes" onPress={() => router.push(`/edit-company/${c.id}`)} />
        <Row icon={{ sf: "eye", md: "visibility" }} title="View public page" onPress={() => router.push(`/company/${c.id}`)} />
      </Section>

      <Section header="Addresses">
        {c.addresses.map((a) => (
          <Row
            key={a.id}
            title={addressTypeLabel[a.address_type] ?? a.address_type}
            subtitle={[a.street_address, a.city, a.country].filter(Boolean).join(", ")}
            onPress={() => router.push({ pathname: "/address-editor", params: { companyId: String(c.id), addressId: String(a.id) } })}
          />
        ))}
        <Row title="Add address" tint chevron={false} onPress={() => router.push({ pathname: "/address-editor", params: { companyId: String(c.id) } })} />
      </Section>

      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.label, paddingHorizontal: 4 }}>Reviews</Text>
        {unanswered > 0 && <Text style={{ fontSize: 16, color: colors.secondaryLabel, paddingHorizontal: 4 }}>{pluralize(unanswered, "review")} without a reply</Text>}
        {reviews.isPending ? (
          <Loading />
        ) : reviews.isError ? (
          <ErrorState message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
        ) : allReviews.length === 0 ? (
          <EmptyState icon={{ sf: "star.bubble", md: "reviews" }} title="No reviews yet" />
        ) : (
          allReviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              footer={
                <Button
                  title={r.reply ? "Edit reply" : "Reply"}
                  variant="outline"
                  icon={{ sf: "arrowshape.turn.up.left.fill", md: "reply" }}
                  onPress={() => router.push({ pathname: "/reply/[id]", params: { id: String(r.id), companyId: String(c.id) } })}
                />
              }
            />
          ))
        )}
        {reviews.hasNextPage && <Button title="Show more reviews" variant="plain" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} />}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------

/**
 * A transfer of this listing to someone else is scheduled (or disputed). The owner's email about
 * it points here, so the dispute form lives on this screen. Who asked is never shown.
 */
function TransferNotice({ company }) {
  const queryClient = useQueryClient();
  const claims = useQuery({ queryKey: keys.claims, queryFn: api.claims.list });
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [document, setDocument] = useState(null);
  const [pickError, setPickError] = useState(null);
  const dispute = useMutation({
    mutationFn: (claimId) => api.claims.object(claimId, response.trim(), document),
    onSuccess: () => {
      haptic("success");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: keys.claims });
    },
  });
  const errors = formErrors(dispute.error, ["response", "document"]);
  const transfers = (claims.data?.results ?? []).filter((x) => x.company === company.id && x.kind !== "REPORT" && (x.status === "SCHEDULED" || x.status === "DISPUTED"));
  if (transfers.length === 0) return null;

  const choose = async () => {
    setPickError(null);
    try {
      const file = await pickDocument();
      if (file) setDocument(file);
    } catch (e) {
      setPickError(errorMessage(e));
    }
  };

  return transfers.map((t) =>
    t.status === "DISPUTED" ? (
      <View key={t.id} style={{ gap: 8, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cell }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name={{ sf: "pause.circle.fill", md: "pause_circle" }} size={20} color={colors.secondaryLabel} />
          <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.label }}>Transfer paused</Text>
        </View>
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.bodyText }}>
          You disputed the transfer of this listing{t.owner_responded_at ? ` on ${formatDate(t.owner_responded_at)}` : ""}. A person at TrastImport is reviewing both sides and will email you.
        </Text>
        {t.owner_response ? (
          <Text selectable style={{ fontSize: 15, lineHeight: 20, color: colors.secondaryLabel }}>
            Your response: “{t.owner_response}”
          </Text>
        ) : null}
      </View>
    ) : (
      <View key={t.id} style={{ gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.dangerSoft }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <Icon name={{ sf: "exclamationmark.triangle.fill", md: "warning" }} size={22} color={colors.danger} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", color: colors.label }}>
              This listing moves to another account{t.transfer_at ? ` on ${formatDate(t.transfer_at)}` : " soon"}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 21, color: colors.bodyText }}>
              Someone asked to take over {company.name} and TrastImport approved it. If that's wrong, dispute it before the date and the transfer is paused while we review both sides.
            </Text>
          </View>
        </View>
        {!open ? (
          <Button title="Dispute this transfer" variant="destructive" onPress={() => setOpen(true)} />
        ) : (
          <View style={{ gap: 12 }}>
            <Banner message={errors.banner ?? pickError} />
            <Field
              inset={false}
              label="Why this is wrong"
              value={response}
              onChangeText={setResponse}
              multiline
              placeholder="e.g. We still run this company; I'm the owner and can show our business license."
              error={errors.field.response}
              style={{ minHeight: 110 }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Button title={document ? document.name : "Attach document (optional)"} variant="outline" icon={{ sf: "paperclip", md: "attach_file" }} onPress={choose} style={{ flex: 1 }} />
              {document ? <Button title="Remove" variant="plain" onPress={() => setDocument(null)} /> : null}
            </View>
            {errors.field.document ? <Text style={{ fontSize: 14, color: colors.danger }}>{errors.field.document}</Text> : null}
            <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>PDF, JPG or PNG, up to 5 MB. Only TrastImport staff see it.</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} />
              <Button title="Send dispute" disabled={!response.trim()} loading={dispute.isPending} onPress={() => dispute.mutate(t.id)} style={{ flex: 2 }} />
            </View>
          </View>
        )}
      </View>
    ),
  );
}

// ---------------------------------------------------------------------------

/** "Manage your profile": the company owner's view. */
export default function ManageCompanyScreen() {
  const id = Number(useLocalSearchParams().id);
  const insets = useSafeAreaInsets();
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const [tab, setTab] = useState(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/my-companies"));

  if (company.isPending) return <Loading />;
  if (company.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.groupedBackground, paddingTop: insets.top + 40 }}>
        <ErrorState message={errorMessage(company.error)} onRetry={() => company.refetch()} />
      </View>
    );
  }

  const c = company.data;
  const shipping = c.company_type === "LOG";
  const tabs = shipping ? TABS : TABS.filter((t) => t.value === "listing");
  const current = tab ?? (shipping ? "departures" : "listing");

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.groupedBackground }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <NavyHeader insetTop={insets.top} onBack={back} logo={<CompanyLogo company={c} size={64} light />} title="Manage your profile" subtitle={`${c.name}, company view`}>
        {tabs.length > 1 && (
          <View accessibilityRole="tablist" style={{ flexDirection: "row", marginTop: 8 }}>
            {tabs.map((t) => {
              const selected = t.value === current;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setTab(t.value)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 4, borderBottomColor: selected ? "#F28C38" : "transparent" }}
                >
                  <Text style={{ fontSize: 19, fontWeight: selected ? "700" : "600", color: selected ? colors.onNavy : colors.onNavySecondary }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </NavyHeader>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <TransferNotice company={c} />
        {current === "departures" && <DeparturesTab company={c} />}
        {current === "prices" && <PricesTab company={c} />}
        {current === "listing" && <ListingTab company={c} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
