import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { Banner, Button, Field, HeaderButton, Icon, Loading, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { countryFlag, initials } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

const FIELDS = ["first_name", "last_name", "country", "city", "phone", "address"];

/** White card with an icon, title and short note, holding a group of fields. */
function Card({ icon, title, note, children }) {
  return (
    <View style={{ backgroundColor: colors.cell, borderRadius: radius.sheet, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, padding: 18, gap: 16, boxShadow: "0 1px 3px rgba(23,36,58,0.04)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, borderCurve: "continuous", backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "800", color: colors.label }}>
            {title}
          </Text>
          {note ? <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>{note}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (customer.data && !form) {
      const { first_name, last_name, country, city, phone, address } = customer.data;
      setForm({ first_name, last_name, country, city, phone, address });
    }
  }, [customer.data, form]);

  const mutation = useMutation({
    mutationFn: () => api.customer.update(form),
    onSuccess: (data) => {
      haptic("success");
      queryClient.setQueryData(keys.customer, data);
      refreshUser().catch(() => {});
      router.back();
    },
  });
  const errors = formErrors(mutation.error, FIELDS);

  if (!form) return <Loading />;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = FIELDS.some((k) => (form[k] ?? "") !== (customer.data[k] ?? ""));
  const name = `${form.first_name ?? ""} ${form.last_name ?? ""}`.trim();
  const flag = countryFlag(customer.data.country_code);
  const save = () => dirty && mutation.mutate();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.groupedBackground }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <Stack.Screen
        options={{
          title: "Account Information",
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
          headerRight: undefined,
        }}
      />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16, width: "100%", maxWidth: 640, alignSelf: "center" }}>
        {/* Who this is */}
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(196,82,10,0.25)" }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.onAccent }}>{initials(name || user?.email || "?")}</Text>
          </View>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.label }}>{name || "Your name"}</Text>
            <Text selectable style={{ fontSize: 14, color: colors.secondaryLabel }}>{user?.email}</Text>
          </View>
        </View>

        <Banner message={errors.banner} />

        <Card icon={{ sf: "person.fill", md: "person" }} title="Your name" note="Reviews show your first name and last initial.">
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field inset={false} label="First name" value={form.first_name} onChangeText={set("first_name")} error={errors.field.first_name} autoComplete="given-name" textContentType="givenName" placeholder="First name" />
            </View>
            <View style={{ flex: 1 }}>
              <Field inset={false} label="Last name" value={form.last_name} onChangeText={set("last_name")} error={errors.field.last_name} autoComplete="family-name" textContentType="familyName" placeholder="Last name" />
            </View>
          </View>
        </Card>

        <Card icon={{ sf: "mappin.and.ellipse", md: "location_on" }} title="Location" note="Your country appears on your reviews.">
          <View>
            <Field
              inset={false}
              label="Country"
              icon={{ sf: "globe", md: "public" }}
              value={form.country}
              onChangeText={set("country")}
              error={errors.field.country}
              autoComplete="country"
              textContentType="countryName"
              placeholder="e.g. China"
            />
            {flag && form.country === customer.data.country ? (
              <Text style={{ position: "absolute", right: 16, top: 41, fontSize: 20 }} accessible={false}>
                {flag}
              </Text>
            ) : null}
          </View>
          <Field inset={false} label="City" icon={{ sf: "building.2", md: "location_city" }} value={form.city} onChangeText={set("city")} error={errors.field.city} textContentType="addressCity" placeholder="e.g. Guangzhou" />
          <Field
            inset={false}
            label="Address"
            icon={{ sf: "house", md: "home" }}
            value={form.address}
            onChangeText={set("address")}
            error={errors.field.address}
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            placeholder="Street and number"
          />
        </Card>

        <Card icon={{ sf: "phone.fill", md: "call" }} title="Contact" note="Private. Never shown on your profile or reviews.">
          <Field
            inset={false}
            label="Phone"
            icon={{ sf: "phone", md: "call" }}
            value={form.phone}
            onChangeText={set("phone")}
            error={errors.field.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+86 …"
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.cell, backgroundColor: colors.groupedBackground }}>
            <Icon name={{ sf: "lock.fill", md: "lock" }} size={14} color={colors.secondaryLabel} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.secondaryLabel }}>Email: {user?.email} · change it in Settings.</Text>
          </View>
        </Card>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: process.env.EXPO_OS === "web" ? 16 : Math.max(insets.bottom, 12), backgroundColor: colors.cell, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button
          title={dirty ? "Save Changes" : "No Changes"}
          icon={dirty ? { sf: "checkmark", md: "check" } : undefined}
          onPress={save}
          loading={mutation.isPending}
          disabled={!dirty}
          style={{ borderRadius: 999, minHeight: 54, width: "100%", maxWidth: 600, alignSelf: "center" }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
