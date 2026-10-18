import { Tabs } from "expo-router";
import { Icon } from "@/components/ui";
import { useUnreadCount } from "@/lib/chat";
import { colors, fonts } from "@/lib/theme";

// Native tabs render as a floating top bar on web, covering screen titles.
// Web gets the bottom navigation from the design instead.
const tab = (title, icon) => ({
  title,
  tabBarIcon: ({ color }) => <Icon name={icon} size={24} color={color} />,
});

export default function TabsLayout() {
  const unread = useUnreadCount();
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
      <Tabs.Screen name="(saved)" options={tab("Favorites", { sf: "heart", md: "favorite" })} />
      {/* The (reviews) group holds the Messages tab; group names don't appear in URLs. */}
      <Tabs.Screen name="(reviews)" options={{ ...tab("Messages", { sf: "bubble.left.and.bubble.right", md: "forum" }), tabBarBadge: unread || undefined }} />
      <Tabs.Screen name="(profile)" options={tab("Profile", { sf: "person", md: "person" })} />
    </Tabs>
  );
}
