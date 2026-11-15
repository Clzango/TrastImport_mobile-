import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { PhoneField } from "@/components/phone-field";
import { Text } from "@/components/text";
import { Banner, Button, Field, haptic, Icon } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";
import { colors } from "@/lib/theme";

const METHODS = [
  { value: "email", label: "Email", icon: { sf: "envelope", md: "mail" } },
  { value: "phone", label: "Phone", icon: { sf: "iphone", md: "smartphone" } },
];

/** Email / Phone switch at the top of Log in and Sign up. */
export function MethodSwitch({ value, onChange }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, borderRadius: 15, borderCurve: "continuous", backgroundColor: colors.steel }}>
      {METHODS.map((m) => {
        const selected = m.value === value;
        return (
          <Pressable
            key={m.value}
            onPress={() => (haptic(), onChange(m.value))}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{ flex: 1, height: 42, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: selected ? colors.cell : "transparent", boxShadow: selected ? "0 1px 4px rgba(15,27,42,0.14)" : undefined }}
          >
            <Icon name={m.icon} size={18} color={selected ? colors.container : colors.inkSecondary} />
            <Text style={{ fontSize: 15, fontWeight: selected ? "800" : "600", color: selected ? colors.ink : colors.inkSecondary }}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/**
 * Phone sign-in and sign-up: texts a 6-digit code (POST /auth/phone/code/), then /verify?mode=phone
 * exchanges it for tokens. A new number gets a new account, so `askName` (Sign up) collects a name.
 */
export function PhoneStart({ askName, defaultCountryCode = "MZ" }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const send = useMutation({
    mutationFn: () => api.auth.phoneCode(phone),
    onSuccess: (res) => {
      haptic("success");
      router.push({ pathname: "/verify", params: { mode: "phone", phone: res.phone, ...splitName(name) } });
    },
  });
  const errors = formErrors(send.error, ["phone"]);
  const ready = phone.length > 6 && (!askName || name.trim());

  return (
    <View style={{ gap: 16 }}>
      <Banner message={errors.banner} />
      {askName && (
        <Field
          inset={false}
          label="Full name"
          icon={{ sf: "person", md: "person" }}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          placeholder="Your name"
        />
      )}
      <PhoneField label="Phone number" value={phone} onChangeText={setPhone} defaultCountryCode={defaultCountryCode} error={errors.field.phone} />
      <Button title="Send code" variant="ink" onPress={() => send.mutate()} loading={send.isPending} disabled={!ready} style={{ minHeight: 56, boxShadow: "0 8px 20px rgba(15,27,42,0.22)" }} />
      <Text style={{ textAlign: "center", fontSize: 13, lineHeight: 19, color: colors.tertiaryLabel }}>We'll text you a 6-digit code. Standard message rates may apply.</Text>
    </View>
  );
}
