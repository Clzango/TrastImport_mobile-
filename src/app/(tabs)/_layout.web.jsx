import { Tabs } from "expo-router";
import { Icon } from "@/components/ui";
import { useUnreadCount } from "@/lib/chat";
import { colors, fonts } from "@/lib/theme";

// Native tabs render as a floating top bar on web, covering screen titles.
// Web gets the bottom navigation from the design instead.
const tab = (title, icon) => ({
  title,
  tabBarIcon: ({ color, focused }) => <Icon name={focused && icon.sfOn ? { ...icon, sf: icon.sfOn } : icon} size={27} color={color} />,
});

export default function TabsLayout() {
  const unread = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarShowLabel: false,
        tabBarStyle: { position: "absolute", left: 14, right: 14, bottom: 22, height: 64, paddingTop: 10, borderRadius: 32, borderTopWidth: 0, backgroundColor: "rgba(255,255,255,0.72)", backdropFilter: "blur(24px) saturate(180%)", boxShadow: "0 10px 34px rgba(15,27,42,0.16), 0 1px 3px rgba(15,27,42,0.08)" },
        tabBarLabelStyle: { fontSize: 12, fontFamily: fonts["600"] },
      }}
    >
      <Tabs.Screen name="(explore)" options={tab("Explore", { sf: "house", sfOn: "house.fill", md: "home" })} />
      <Tabs.Screen name="(saved)" options={tab("Favorites", { sf: "heart", sfOn: "heart.fill", md: "favorite" })} />
      {/* The (reviews) group holds the Messages tab; group names don't appear in URLs. */}
      <Tabs.Screen name="(reviews)" options={{ ...tab("Messages", { sf: "ellipsis.message", sfOn: "ellipsis.message.fill", md: "chat" }), tabBarBadge: unread || undefined }} />
      <Tabs.Screen name="(profile)" options={tab("Profile", { sf: "person.crop.circle", sfOn: "person.crop.circle.fill", md: "account_circle" })} />
    </Tabs>
  );
}
