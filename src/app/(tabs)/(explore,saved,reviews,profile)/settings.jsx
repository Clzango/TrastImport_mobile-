import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert } from "react-native";
import { Text } from "@/components/text";
import { Pill, Row, Screen, Section } from "@/components/ui";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statusLabel } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me });
  const verifications = useQuery({ queryKey: keys.verifications, queryFn: api.verifications.list });
  const claims = useQuery({ queryKey: keys.claims, queryFn: api.claims.list });
  const companies = useQuery({ queryKey: keys.myCompanies, queryFn: api.companies.mine });
  const latestVerification = verifications.data?.results[0];
  const pendingClaims = claims.data?.results.filter((x) => x.status === "PENDING").length ?? 0;
  const myCompanies = companies.data ?? [];

  const confirmSignOut = () => {
    // Signing out swaps the app for Log in (see the root layout).
    const run = () => signOut();
    if (process.env.EXPO_OS === "web") return run();
    Alert.alert("Log Out?", "You'll need to log in again to use TrastImport.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: run },
    ]);
  };

  return (
    <Screen>
      <Section header="Your Activity">
        <Row iconStyle="plain" icon={{ sf: "star", md: "star_outline" }} title="My Reviews" onPress={() => router.push("/my-reviews")} />
        <Row
          iconStyle="plain"
          icon={{ sf: "checkmark.shield", md: "verified_user" }}
          title="Buyer Verification"
          value={customer.data?.is_verified ? undefined : latestVerification ? statusLabel[latestVerification.status] : "Not verified"}
          accessory={customer.data?.is_verified ? <Pill label="Approved" tone="success" /> : undefined}
          onPress={() => router.push("/verification")}
        />
        <Row iconStyle="plain" icon={{ sf: "doc.text", md: "description" }} title="My Claims" value={pendingClaims ? `${pendingClaims} pending` : undefined} onPress={() => router.push("/claims")} />
        {myCompanies.length > 0 && (
          <Row iconStyle="plain" icon={{ sf: "building.2", md: "domain" }} title="My Companies" value={String(myCompanies.length)} onPress={() => router.push("/my-companies")} />
        )}
      </Section>

      <Section header="Sign-in">
        <Row title="Email" value={user?.email} selectable />
        <Row title="Change Email" onPress={() => router.push("/change-email")} />
        <Row title="Change Password" onPress={() => router.push("/change-password")} />
      </Section>

      <Section>
        <Row title="Log Out" tint chevron={false} onPress={confirmSignOut} />
      </Section>

      <Section footer="Deleting your account removes your profile. This can't be undone.">
        <Row title="Delete Account" destructive chevron={false} onPress={() => router.push("/delete-account")} />
      </Section>

      <Text style={{ fontSize: 12, color: colors.tertiaryLabel, textAlign: "center" }}>
        {API_URL}
      </Text>
    </Screen>
  );
}
