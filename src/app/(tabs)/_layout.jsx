import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnreadCount } from "@/lib/chat";
import { colors } from "@/lib/theme";

// Android draws a Material bottom bar with its own lavender/blue defaults; give it the app's dark
// ink bar with an orange pill behind the selected tab.
// iOS keeps the system bar (Liquid Glass), so these only apply on Android.
const ANDROID_BAR =
  process.env.EXPO_OS === "android"
    ? {
        backgroundColor: colors.ink,
        indicatorColor: colors.container,
        rippleColor: "rgba(255,255,255,0.12)",
        iconColor: { default: "rgba(255,255,255,0.62)", selected: colors.onAccent },
        badgeBackgroundColor: colors.cargo,
        badgeTextColor: colors.cargoInk,
        shadowColor: "transparent",
        labelVisibilityMode: "unlabeled",
      }
    : {};

export default function TabsLayout() {
  const unread = useUnreadCount();
  return (
    <NativeTabs tintColor={colors.ink} minimizeBehavior="onScrollDown" {...ANDROID_BAR}>
      <NativeTabs.Trigger name="(explore)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label hidden>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(saved)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} md="favorite" />
        <NativeTabs.Trigger.Label hidden>Favorites</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* The (reviews) group holds the Messages tab; group names don't appear in URLs. */}
      <NativeTabs.Trigger name="(reviews)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: "ellipsis.message", selected: "ellipsis.message.fill" }} md="chat" />
        <NativeTabs.Trigger.Label hidden>Messages</NativeTabs.Trigger.Label>
        {/* Rendered only when there is something unread: Android showed "0" when it was merely hidden. */}
        {unread > 0 && <NativeTabs.Trigger.Badge>{unread > 99 ? "99+" : String(unread)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        <NativeTabs.Trigger.Label hidden>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
