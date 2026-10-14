import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { Avatar, Button, PageTitle, Pill, Row, Screen, Section, VerifiedBadge } from "@/components/ui";
import { api, USE_MOCK } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials, statusLabel } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

const card = { backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sheet, borderCurve: "continuous" as const, padding: 20, gap: 16 };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const signedIn = !!user;
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me, enabled: signedIn });
  const verifications = useQuery({ queryKey: keys.verifications, queryFn: api.verifications.list, enabled: signedIn });
  const claims = useQuery({ queryKey: keys.claims, queryFn: api.claims.list, enabled: signedIn });
  const companies = useQuery({ queryKey: keys.myCompanies, queryFn: api.companies.mine, enabled: signedIn });

  const login = () => router.push("/login");
  const gated = (go: () => void) => (signedIn ? go : login);

  const c = customer.data;
  const name = c ? `${c.first_name} ${c.last_name}`.trim() : user ? `${user.first_name} ${user.last_name}`.trim() : "";
  const latestVerification = verifications.data?.results[0];
  const pendingClaims = claims.data?.results.filter((x) => x.status === "PENDING").length ?? 0;

  return (
    <Screen
      contentContainerStyle={{ paddingTop: insets.top + 28 }}
      refreshControl={
        signedIn ? (
          <RefreshControl
            refreshing={customer.isRefetching}
            onRefresh={() => {
              customer.refetch();
              verifications.refetch();
              claims.refetch();
              companies.refetch();
            }}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      <PageTitle>Profile</PageTitle>

      {signedIn ? (
        <View style={card}>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Avatar text={initials(name || user.email)} size={52} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.label }}>{name || "Your name"}</Text>
              <Text selectable numberOfLines={1} style={{ fontSize: 14, color: colors.secondaryLabel }}>{user.email}</Text>
              {c?.is_verified && <VerifiedBadge label="Verified buyer" />}
            </View>
          </View>
          {!c?.is_verified && (
            <Button
              title={latestVerification?.status === "PENDING" ? "Verification under review" : "Get verified"}
              variant="outline"
              icon={{ sf: "checkmark.shield", md: "verified_user" }}
              onPress={() => router.push("/verification")}
            />
          )}
        </View>
      ) : (
        <View style={card}>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Avatar text="" size={52} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.label }}>You're not logged in</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: colors.secondaryLabel }}>Log in to save companies and write reviews.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Log In" onPress={login} style={{ flex: 1, minHeight: 48, borderRadius: radius.cell }} />
            <Button title="Create Account" variant="outline" onPress={() => router.push("/signup")} style={{ flex: 1, minHeight: 48, borderRadius: radius.cell }} />
          </View>
          {USE_MOCK && <Text style={{ fontSize: 12, color: colors.tertiaryLabel }}>Demo mode: demo@trastimport.com / password123</Text>}
        </View>
      )}

      <Section header="Your activity">
        <Row iconStyle="plain" icon={{ sf: "star", md: "star_outline" }} title="My Reviews" locked={!signedIn} onPress={gated(() => router.navigate("/my-reviews"))} />
        <Row iconStyle="plain" icon={{ sf: "bookmark", md: "bookmark_border" }} title="Saved Companies" onPress={() => router.navigate("/saved")} />
        <Row iconStyle="plain" icon={{ sf: "person.text.rectangle", md: "badge" }} title="Account Information" locked={!signedIn} onPress={gated(() => router.push("/edit-profile"))} />
        {signedIn && (
          <Row
            iconStyle="plain"
            icon={{ sf: "checkmark.shield", md: "verified_user" }}
            title="Buyer Verification"
            value={c?.is_verified ? undefined : latestVerification ? statusLabel[latestVerification.status] : "Not verified"}
            accessory={c?.is_verified ? <Pill label="Approved" tone="success" /> : undefined}
            onPress={() => router.push("/verification")}
          />
        )}
        {signedIn && (
          <Row iconStyle="plain" icon={{ sf: "doc.text", md: "description" }} title="My Claims" value={pendingClaims ? `${pendingClaims} pending` : undefined} onPress={() => router.push("/claims")} />
        )}
        {signedIn && (companies.data?.length ?? 0) > 0 && (
          <Row iconStyle="plain" icon={{ sf: "building.2", md: "domain" }} title="My Companies" value={String(companies.data!.length)} onPress={() => router.push("/my-companies")} />
        )}
      </Section>

      <Section header="Preferences">
        <Row iconStyle="plain" icon={{ sf: "globe", md: "language" }} title="Language" value="English" />
        <Row iconStyle="plain" icon={{ sf: "moon", md: "dark_mode" }} title="Appearance" value="Light" />
        <Row iconStyle="plain" icon={{ sf: "gearshape", md: "settings" }} title="Settings" locked={!signedIn} onPress={gated(() => router.push("/settings"))} />
      </Section>
    </Screen>
  );
}
