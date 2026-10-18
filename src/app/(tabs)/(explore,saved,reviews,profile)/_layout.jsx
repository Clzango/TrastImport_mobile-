import { Stack } from "expo-router/stack";
import { colors, fonts } from "@/lib/theme";

// Each tab gets its own stack; the screens below are shared so any tab can push them.
// Tab roots draw their own header (brand row and big title), as in the design.
const roots = {
  "(explore)": "index",
  "(saved)": "saved",
  "(reviews)": "messages",
  "(profile)": "profile",
};

export default function TabStackLayout({ segment }) {
  const root = roots[segment] ?? roots["(explore)"];

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.label,
        headerBackButtonDisplayMode: "minimal",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.cell },
        headerTitleStyle: { color: colors.label, fontFamily: fonts["700"], fontSize: 16 },
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name={root} options={{ headerShown: false }} />
      {/* Other tabs' roots can also land in this stack (e.g. by URL on web). */}
      {Object.values(roots)
        .filter((name) => name !== root)
        .map((name) => (
          <Stack.Screen key={name} name={name} options={{ headerShown: false }} />
        ))}
      <Stack.Screen name="company/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="my-reviews" options={{ title: "" }} />
      <Stack.Screen name="help" options={{ title: "" }} />
      <Stack.Screen name="claims" options={{ title: "My Claims" }} />
      <Stack.Screen name="verification" options={{ title: "Get Verified" }} />
      <Stack.Screen name="my-companies" options={{ title: "My Companies" }} />
      <Stack.Screen name="manage/[id]" options={{ title: "Manage" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
