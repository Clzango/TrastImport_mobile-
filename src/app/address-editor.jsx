import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { Banner, Button, Field, HeaderButton, Icon, Loading, Row, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { addressTypeLabel } from "@/lib/format";
import { formErrors } from "@/lib/form-errors";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

const TYPES = Object.keys(addressTypeLabel);
const FIELDS = ["address_type", "country", "city", "street_address"];

export default function AddressEditorScreen() {
  const params = useLocalSearchParams();
  const companyId = Number(params.companyId);
  const addressId = params.addressId ? Number(params.addressId) : undefined;
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: keys.company(companyId), queryFn: () => api.companies.get(companyId) });

  const [type, setType] = useState("OFFICE");
  const [country, setCountry] = useState("China");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [loaded, setLoaded] = useState(!addressId);

  useEffect(() => {
    const a = company.data?.addresses.find((x) => x.id === addressId);
    if (a && !loaded) {
      setType(a.address_type);
      setCountry(a.country);
      setCity(a.city);
      setStreet(a.street_address);
      setLoaded(true);
    }
  }, [company.data, addressId, loaded]);

  const done = () => {
    haptic("success");
    queryClient.invalidateQueries({ queryKey: keys.company(companyId) });
    queryClient.invalidateQueries({ queryKey: keys.companies() });
    router.back();
  };

  const save = useMutation({
    mutationFn: () => {
      const data = { address_type: type, country: country.trim(), city: city.trim(), street_address: street.trim() };
      return addressId ? api.addresses.update(addressId, data) : api.companies.addAddress(companyId, data);
    },
    onSuccess: done,
  });
  const remove = useMutation({ mutationFn: () => api.addresses.remove(addressId), onSuccess: done });
  const errors = formErrors(save.error ?? remove.error, FIELDS);

  const confirmRemove = () => {
    if (process.env.EXPO_OS === "web") return remove.mutate();
    Alert.alert("Delete Address?", "It will no longer show on your listing.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
    ]);
  };

  if (!loaded) return <Loading />;

  return (
    <>
      <Stack.Screen
        options={{
          title: addressId ? "Edit Address" : "New Address",
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () => (save.isPending ? <ActivityIndicator color={colors.accent} /> : <HeaderButton title="Save" bold disabled={!city.trim()} onPress={() => save.mutate()} />),
        }}
      />
      <Screen>
        <Banner message={errors.banner} />
        <Section header="Type">
          {TYPES.map((t) => (
            <Row key={t} title={addressTypeLabel[t]} chevron={false} onPress={() => setType(t)} accessory={type === t ? <Icon name={{ sf: "checkmark", md: "check" }} size={16} weight="semibold" /> : undefined} />
          ))}
        </Section>
        <Section header="Location">
          <Field label="Country" value={country} onChangeText={setCountry} error={errors.field.country} />
          <Field label="City" value={city} onChangeText={setCity} error={errors.field.city} />
          <Field label="Street address" value={street} onChangeText={setStreet} multiline error={errors.field.street_address} style={{ minHeight: 60 }} />
        </Section>
        {addressId && <Button title="Delete Address" variant="destructive" loading={remove.isPending} onPress={confirmRemove} />}
      </Screen>
    </>
  );
}
