import { router } from "expo-router";
import { Alert } from "react-native";
import { Text } from "@/components/text";
import { Row, Screen, Section } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

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
