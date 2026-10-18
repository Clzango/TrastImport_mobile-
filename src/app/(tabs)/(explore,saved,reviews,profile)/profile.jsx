import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { currentLanguage, LanguageSheet } from "@/components/language";
import { Text } from "@/components/text";
import { Icon, VerifiedBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useConversations, useUnreadCount } from "@/lib/chat";
import { countryFlag, initials } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useSaved } from "@/lib/saved";
import { colors } from "@/lib/theme";

function MenuRow({ icon, title, value, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 64, paddingHorizontal: 4, backgroundColor: pressed ? colors.fill : "transparent", borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator })}
    >
      <Icon name={icon} size={23} color={colors.label} />
      <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: colors.label }}>{title}</Text>
      {value !== undefined && value !== null && value !== "" ? <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>{value}</Text> : null}
      <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={15} color={colors.tertiaryLabel} weight="semibold" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { saved } = useSaved();
  const conversations = useConversations();
  const unread = useUnreadCount();
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me });
  const [language, setLanguage] = useState(false);

  const c = customer.data;
  const name = c ? `${c.first_name} ${c.last_name}`.trim() : `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();

  const confirmSignOut = () => {
    // Signing out swaps the app for the Welcome screen (see the root layout).
    if (process.env.EXPO_OS === "web") return signOut();
    Alert.alert("Log Out?", "You'll need to log in again to use TrastImport.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: 20, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={customer.isRefetching}
          onRefresh={() => {
            customer.refetch();
            conversations.refetch();
          }}
          tintColor={colors.accent}
        />
      }
    >
      {/* Identity */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <View style={{ width: 92, height: 92, borderRadius: 46, overflow: "hidden", backgroundColor: "#E6EBF2", alignItems: "center", justifyContent: "center" }}>
          {c?.avatar ? (
            <Image source={{ uri: c.avatar }} contentFit="cover" style={{ width: 92, height: 92 }} accessibilityLabel="Profile photo" />
          ) : (
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.secondaryLabel }}>{initials(name || user?.email || "?")}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text numberOfLines={2} style={{ flex: 1, fontSize: 19, fontWeight: "800", color: colors.label }}>
              {name || "Your name"}
            </Text>
            {c?.country_code ? <Text style={{ fontSize: 22 }}>{countryFlag(c.country_code)}</Text> : null}
          </View>
          <Text selectable numberOfLines={1} style={{ fontSize: 14, color: colors.secondaryLabel }}>
            {user?.email}
          </Text>
          {c?.is_verified && <VerifiedBadge label="Verified buyer" />}
          <Pressable
            onPress={() => router.push("/edit-profile")}
            accessibilityRole="button"
            style={({ pressed }) => ({ alignSelf: "flex-start", marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: pressed ? colors.segment : colors.fill })}
          >
            <Icon name={{ sf: "square.and.pencil", md: "edit" }} size={14} color={colors.bodyText} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.bodyText }}>Edit Profile</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <MenuRow icon={{ sf: "text.magnifyingglass", md: "manage_search" }} title="My Inquiries" value={conversations.data?.count ?? ""} onPress={() => router.navigate("/messages")} />
        <MenuRow icon={{ sf: "heart", md: "favorite_border" }} title="Saved Companies" value={saved.length} onPress={() => router.navigate("/saved")} />
        <MenuRow icon={{ sf: "envelope.open", md: "drafts" }} title="Messages" value={unread || ""} onPress={() => router.navigate("/messages")} />
        <MenuRow icon={{ sf: "gearshape", md: "settings" }} title="Settings" onPress={() => router.push("/settings")} />
        <MenuRow icon={{ sf: "globe", md: "language" }} title="Language" value={currentLanguage.name} onPress={() => setLanguage(true)} />
        <MenuRow icon={{ sf: "questionmark.circle", md: "help_outline" }} title="Help & Support" onPress={() => router.push("/help")} />
        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 64, paddingHorizontal: 4, backgroundColor: pressed ? colors.fill : "transparent" })}
        >
          <Icon name={{ sf: "rectangle.portrait.and.arrow.right", md: "logout" }} size={23} color={colors.label} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: colors.label }}>Log Out</Text>
        </Pressable>
      </View>

      <LanguageSheet visible={language} onClose={() => setLanguage(false)} />
    </ScrollView>
  );
}
