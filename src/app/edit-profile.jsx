import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Banner, Field, HeaderButton, Loading, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

const FIELDS = ["first_name", "last_name", "country", "city", "phone", "address"];

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
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
        <Section header="Name" footer="Shown on your reviews as first name and last initial.">
          <Field label="First name" value={form.first_name} onChangeText={set("first_name")} error={errors.field.first_name} textContentType="givenName" />
          <Field label="Last name" value={form.last_name} onChangeText={set("last_name")} error={errors.field.last_name} textContentType="familyName" />
        </Section>
        <Section header="Location" footer="Your country is shown on your reviews.">
          <Field label="Country" value={form.country} onChangeText={set("country")} error={errors.field.country} textContentType="countryName" />
          <Field label="City" value={form.city} onChangeText={set("city")} error={errors.field.city} textContentType="addressCity" />
          <Field label="Address" value={form.address} onChangeText={set("address")} error={errors.field.address} textContentType="fullStreetAddress" />
        </Section>
        <Section header="Contact" footer="Never shown publicly.">
          <Field label="Phone" value={form.phone} onChangeText={set("phone")} error={errors.field.phone} keyboardType="phone-pad" textContentType="telephoneNumber" />
        </Section>
      </Screen>
    </>
  );
}
