import { router } from "expo-router";
import { Alert } from "react-native";
import { Text } from "@/components/text";
import { Row, Screen, Section } from "@/components/ui";
import { API_URL, USE_MOCK } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const confirmSignOut = () => {
    const run = () => {
      signOut();
      router.back();
    };
    if (process.env.EXPO_OS === "web") return run();
    Alert.alert("Log Out?", "You'll need to log in again to write reviews.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: run },
    ]);
  };

  return (
    <Screen>
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
        {USE_MOCK ? "Demo data (no API server configured)" : API_URL}
      </Text>
    </Screen>
  );
}
