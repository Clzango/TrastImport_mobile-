import { Tabs } from "expo-router";
import { Icon } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";

// Native tabs render as a floating top bar on web, covering screen titles.
// Web gets the bottom navigation from the design instead.
const tab = (title, icon) => ({
  title,
  tabBarIcon: ({ color }) => <Icon name={icon} size={24} color={color} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: { backgroundColor: colors.cell, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontFamily: fonts["600"] },
      }}
    >
      <Tabs.Screen name="(explore)" options={tab("Explore", { sf: "safari", md: "explore" })} />
      <Tabs.Screen name="(saved)" options={tab("Saved", { sf: "bookmark", md: "bookmark" })} />
      <Tabs.Screen name="(reviews)" options={tab("Reviews", { sf: "star", md: "star" })} />
      <Tabs.Screen name="(profile)" options={tab("Profile", { sf: "person", md: "person" })} />
    </Tabs>
  );
}
