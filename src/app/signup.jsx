import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AuthLayout } from "@/components/auth-ui";
import { MethodSwitch, PhoneStart } from "@/components/phone-sign-in";
import { SocialSignIn } from "@/components/social-sign-in";
import { PillTabs } from "@/components/pill-tabs";
import { SelectField } from "@/components/select-field";
import { Text } from "@/components/text";
import { Banner, Button, Field, haptic } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/form-errors";
import { colors } from "@/lib/theme";

const ACCOUNT_TYPES = [
  { value: "BUSINESS", label: "I sell or ship" },
  { value: "PERSONAL", label: "I'm importing" },
];

// Business accounts are for companies listed on TrastImport; SUP and LOG match the API's
// company types. Importers and buyers sign up with a personal account.
const BUSINESS_TYPES = [
  { value: "SUP", label: "Supplier / Manufacturer", description: "Find buyers and showcase your products", icon: { sf: "building.2.fill", md: "factory" } },
  { value: "LOG", label: "Shipping / Logistics Company", description: "Offer freight and logistics services", icon: { sf: "ferry.fill", md: "directions_boat" } },
];

const FIELDS = ["first_name", "last_name", "company_name", "business_type", "email", "password"];

/** "Ana Maria Souza" → first "Ana", last "Maria Souza". */
function splitName(full) {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
}

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [accountType, setAccountType] = useState("BUSINESS");
  const [method, setMethod] = useState("email");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const business = accountType === "BUSINESS";

  const mutation = useMutation({
    mutationFn: () =>
      signUp({
        ...splitName(fullName),
        email: email.trim(),
        password,
        account_type: accountType,
        ...(business && { company_name: companyName.trim(), business_type: businessType }),
      }),
    onSuccess: (result) => {
      haptic("success");
      // Otherwise signing up swaps this screen for the app (see the root layout).
      if (result === "confirmEmail") router.replace({ pathname: "/verify", params: { mode: "signup", email: email.trim() } });
    },
  });
  const errors = formErrors(mutation.error, FIELDS);
  const nameError = errors.field.first_name ?? errors.field.last_name;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = fullName.trim() && email && password.length >= 8 && confirm === password && (!business || (companyName.trim() && businessType));

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes about a minute."
      footer={
        <Text style={{ textAlign: "center", fontSize: 15, color: colors.secondaryLabel }}>
          Already have an account?{" "}
          <Text onPress={() => router.replace("/login")} style={{ fontWeight: "800", color: colors.container }} accessibilityRole="link">
            Log in
          </Text>
        </Text>
      }
    >
      <MethodSwitch value={method} onChange={setMethod} />
      <View style={{ height: 18 }} />
      {method === "phone" ? (
        <PhoneStart askName />
      ) : (
      <View style={{ gap: 16 }}>
        <PillTabs options={ACCOUNT_TYPES} value={accountType} onChange={setAccountType} />
        <Banner message={errors.banner} />
        {business && (
          <Field
            inset={false}
            label="Company name"
            icon={{ sf: "building.2", md: "domain" }}
            value={companyName}
            onChangeText={setCompanyName}
            autoComplete="organization"
            textContentType="organizationName"
            placeholder="Enter your company name"
            error={errors.field.company_name}
          />
        )}
        <Field
          inset={false}
          label={business ? "Your full name" : "Full name"}
          icon={{ sf: "person", md: "person" }}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          textContentType="name"
          placeholder="Enter your name"
          error={nameError}
        />
        <Field
          inset={false}
          label="Email address"
          icon={{ sf: "envelope", md: "mail" }}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="Enter your email"
          error={errors.field.email}
        />
        <Field
          inset={false}
          label="Password"
          icon={{ sf: "lock", md: "lock" }}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Create a strong password"
          error={errors.field.password}
        />
        <Field
          inset={false}
          label="Confirm password"
          icon={{ sf: "lock", md: "lock" }}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          revealable
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Confirm your password"
          error={mismatch ? "Passwords don't match." : undefined}
        />
        {business && (
          <SelectField
            label="Business type"
            icon={{ sf: "building.2", md: "business" }}
            placeholder="Select business type"
            options={BUSINESS_TYPES}
            value={businessType}
            onChange={setBusinessType}
            error={errors.field.business_type}
          />
        )}
        <Button
          title="Create account"
          variant="ink"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!ready}
          style={{ marginTop: 6, minHeight: 56, boxShadow: "0 8px 20px rgba(15,27,42,0.22)" }}
        />
        <Text style={{ textAlign: "center", fontSize: 13, lineHeight: 19, color: colors.tertiaryLabel }}>
          We'll email you a 6-digit code to confirm your address.
          {business ? " Your company's listing is created once you confirm it, and you can manage it from Profile." : ""}
        </Text>
      </View>
      )}

      <View style={{ marginTop: 24 }}>
        <SocialSignIn label="or sign up with" />
      </View>
    </AuthLayout>
  );
}
