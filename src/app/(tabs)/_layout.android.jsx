import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui";
import { useUnreadCount } from "@/lib/chat";
import { colors, fonts } from "@/lib/theme";

// Android's native Material bar is a fixed 80dp tall and takes too much room on small phones
// (Galaxy S24 and similar), so Android gets a compact bottom bar from the design instead:
// white, 56dp plus the gesture area, small labels, orange for the selected tab. iOS keeps the
// native bar (_layout.jsx) and web has its own (_layout.web.jsx).
const tab = (title, icon) => ({
  title,
  tabBarIcon: ({ color, focused }) => <Icon name={focused && icon.mdOn ? { ...icon, md: icon.mdOn } : icon} size={24} color={color} />,
});

export default function TabsLayout() {
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: colors.cell,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts["600"], marginTop: 0 },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="(explore)" options={tab("Explore", { sf: "house", md: "home" })} />
      <Tabs.Screen name="(saved)" options={tab("Favorites", { sf: "heart", md: "favorite_border", mdOn: "favorite" })} />
      {/* The (reviews) group holds the Messages tab; group names don't appear in URLs. */}
      <Tabs.Screen name="(reviews)" options={{ ...tab("Messages", { sf: "ellipsis.message", md: "chat_bubble_outline", mdOn: "chat_bubble" }), tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined }} />
      <Tabs.Screen name="(profile)" options={tab("Profile", { sf: "person.crop.circle", md: "account_circle" })} />
    </Tabs>
  );
}
