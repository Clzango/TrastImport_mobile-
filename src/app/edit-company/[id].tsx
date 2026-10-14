import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Banner, Field, HeaderButton, Loading, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

const FIELDS = ["name", "description", "phone", "wechat_id", "website", "moq", "main_products", "routes_serviced"] as const;
type Form = Record<(typeof FIELDS)[number], string>;

export default function EditCompanyScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: keys.company(id), queryFn: () => api.companies.get(id) });
  const [form, setForm] = useState<Form | null>(null);

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
      });
    }
  }, [company.data, form]);

  const supplier = company.data?.company_type === "SUP";

  const mutation = useMutation({
    mutationFn: () => {
      const { moq, main_products, routes_serviced, ...common } = form!;
      return api.companies.update(id, supplier ? { ...common, moq: moq ? Number(moq) : null, main_products } : { ...common, routes_serviced });
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
  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f!, [key]: value }));

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () => (mutation.isPending ? <ActivityIndicator color={colors.accent as string} /> : <HeaderButton title="Save" bold onPress={() => mutation.mutate()} />),
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
          <Section header="Routes" footer="Separate routes with commas, e.g. Ningbo → Santos, Shanghai → Lagos.">
            <Field label="Routes serviced" value={form.routes_serviced} onChangeText={set("routes_serviced")} multiline error={errors.field.routes_serviced} />
          </Section>
        )}
        <Section header="Contact">
          <Field label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" error={errors.field.phone} />
          <Field label="WeChat ID" value={form.wechat_id} onChangeText={set("wechat_id")} autoCapitalize="none" error={errors.field.wechat_id} />
          <Field label="Website" value={form.website} onChangeText={set("website")} autoCapitalize="none" keyboardType="url" error={errors.field.website} />
        </Section>
      </Screen>
    </>
  );
}
