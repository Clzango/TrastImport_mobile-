import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Checkbox } from "@/components/auth-ui";
import { PhoneField } from "@/components/phone-field";
import { Text } from "@/components/text";
import { Banner, Field, HeaderButton, Loading, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

const FIELDS = ["name", "description", "phone", "wechat_id", "website", "moq", "main_products", "routes_serviced", "ships_to", "customs_included"];

export default function EditCompanyScreen() {
  const id = Number(useLocalSearchParams().id);
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const [form, setForm] = useState(null);

  useEffect(() => {
    const c = company.data;
    if (c && !form) {
      setForm({
        name: c.name,
        description: c.description,
        phone: c.phone,
        wechat_id: c.wechat_id,
        website: c.website,
        moq: c.moq === null ? "" : String(c.moq),
        main_products: c.main_products,
        routes_serviced: c.routes_serviced,
        ships_to: (c.ships_to ?? []).join(", "),
        customs_included: !!c.customs_included,
      });
    }
  }, [company.data, form]);

  const supplier = company.data?.company_type === "SUP";

  const mutation = useMutation({
    mutationFn: () => {
      const { moq, main_products, routes_serviced, ships_to, customs_included, ...common } = form;
      if (supplier) return api.companies.update(id, { ...common, moq: moq ? Number(moq) : null, main_products });
      // Country names or ISO codes, separated by commas.
      const destinations = ships_to.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
      return api.companies.update(id, { ...common, routes_serviced, ships_to: destinations, customs_included });
    },
    onSuccess: (data) => {
      haptic("success");
      queryClient.setQueryData(keys.company(id), data);
      queryClient.invalidateQueries({ queryKey: keys.myCompanies });
      queryClient.invalidateQueries({ queryKey: keys.companies() });
      router.back();
    },
  });
  const errors = formErrors(mutation.error, FIELDS);

  if (!form) return <Loading />;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () => (mutation.isPending ? <ActivityIndicator color={colors.accent} /> : <HeaderButton title="Save" bold onPress={() => mutation.mutate()} />),
        }}
      />
      <Screen>
        <Banner message={errors.banner} />
        <Section header="Company">
          <Field label="Name" value={form.name} onChangeText={set("name")} error={errors.field.name} />
          <Field label="Description" value={form.description} onChangeText={set("description")} multiline error={errors.field.description} />
        </Section>
        {supplier ? (
          <Section header="Products">
            <Field label="Main products" value={form.main_products} onChangeText={set("main_products")} placeholder="LED strips, chargers…" error={errors.field.main_products} />
            <Field label="Minimum order quantity" value={form.moq} onChangeText={set("moq")} keyboardType="number-pad" error={errors.field.moq} />
          </Section>
        ) : (
          <>
            <Section header="Shipping" footer="Ships to: country names or codes, separated by commas (Brazil, Mexico or BR, MX). Buyers filter by these, and your departures and prices use them.">
              <Field label="Ships to" value={form.ships_to} onChangeText={set("ships_to")} autoCapitalize="words" placeholder="Brazil, Mexico" error={errors.field.ships_to} />
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <Checkbox label="Customs clearance is included in my prices" value={form.customs_included} onChange={set("customs_included")} />
                {errors.field.customs_included ? <Text style={{ fontSize: 13, color: colors.danger }}>{errors.field.customs_included}</Text> : null}
              </View>
            </Section>
            <Section header="Routes" footer="Separate routes with commas, e.g. Ningbo → Santos, Shanghai → Lagos.">
              <Field label="Routes serviced" value={form.routes_serviced} onChangeText={set("routes_serviced")} multiline error={errors.field.routes_serviced} />
            </Section>
          </>
        )}
        <Section header="Contact">
          <PhoneField label="Phone" value={form.phone} onChangeText={set("phone")} defaultCountryCode={company.data?.addresses?.[0]?.country_code ?? "CN"} error={errors.field.phone} />
          <Field label="WeChat ID" value={form.wechat_id} onChangeText={set("wechat_id")} autoCapitalize="none" error={errors.field.wechat_id} />
          <Field label="Website" value={form.website} onChangeText={set("website")} autoCapitalize="none" keyboardType="url" error={errors.field.website} />
        </Section>
      </Screen>
    </>
  );
}
