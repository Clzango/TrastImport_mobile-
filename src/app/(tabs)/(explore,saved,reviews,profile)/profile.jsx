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
import { useOwnedCompanyIds } from "@/lib/ownership";
import { keys } from "@/lib/query-keys";
import { useSaved } from "@/lib/saved";
import { colors } from "@/lib/theme";

function MenuRow({ icon, title, value, onPress, last, danger }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 13, minHeight: 64, paddingHorizontal: 4, backgroundColor: pressed ? colors.fill : "transparent", borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: danger ? colors.dangerSoft : colors.limeSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.forest} />
      </View>
      <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: danger ? colors.danger : colors.forest }}>{title}</Text>
      {value !== undefined && value !== null && value !== "" ? <View style={{ minWidth: 28, height: 26, borderRadius: 999, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.fill }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.secondaryLabel }}>{value}</Text></View> : null}
      <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={15} color={colors.faint} weight="semibold" />
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
  const owned = useOwnedCompanyIds();

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
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 36, gap: 16 }}
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
      <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.7, color: colors.forest }}>My profile</Text>
      {/* Identity */}
      <View style={{ overflow: "hidden", borderRadius: 26, borderCurve: "continuous", backgroundColor: colors.cell, padding: 18, gap: 16, borderWidth: 1, borderColor: colors.border, boxShadow: "0 8px 24px rgba(16,38,63,0.05)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, overflow: "hidden", backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center" }}>
            {c?.avatar ? (
              <Image source={{ uri: c.avatar }} contentFit="cover" style={{ width: 72, height: 72 }} accessibilityLabel="Profile photo" />
            ) : (
              <Text style={{ fontSize: 26, fontWeight: "800", color: colors.forest }}>{initials(name || user?.email || "?")}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Text numberOfLines={2} style={{ flex: 1, fontSize: 20, fontWeight: "800", color: colors.forest }}>
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
              style={({ pressed }) => ({ alignSelf: "flex-start", marginTop: 5, flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: pressed ? colors.lime : colors.limeSoft })}
            >
              <Icon name={{ sf: "square.and.pencil", md: "edit" }} size={14} color={colors.forest} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.forest }}>Edit profile</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.separator }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Saved", count: saved.length, icon: { sf: "heart", md: "favorite_border" }, onPress: () => router.navigate("/saved") },
            { label: "Messages", count: unread || 0, icon: { sf: "bubble.left.and.bubble.right", md: "forum" }, onPress: () => router.navigate("/messages") },
            { label: "Companies", count: owned.length, icon: { sf: "building.2", md: "domain" }, onPress: () => owned.length && router.push(owned.length === 1 ? `/manage/${owned[0]}` : "/my-companies") },
          ].map((item) => (
            <Pressable key={item.label} onPress={item.onPress} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 62, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: pressed ? colors.lime : colors.limeSoft, justifyContent: "space-between" })}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Icon name={item.icon} size={15} color={colors.forest} />
                <Text style={{ fontSize: 17, fontWeight: "800", color: colors.forest }}>{item.count}</Text>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: colors.limeInk }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: colors.cell, borderRadius: 22, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, boxShadow: "0 6px 20px rgba(16,38,63,0.035)" }}>
        {owned.length > 0 && (
          <MenuRow
            icon={{ sf: "building.2", md: "domain" }}
            title={owned.length === 1 ? "Manage my company" : "My companies"}
            value={owned.length > 1 ? owned.length : ""}
            onPress={() => router.push(owned.length === 1 ? `/manage/${owned[0]}` : "/my-companies")}
          />
        )}
        <MenuRow icon={{ sf: "text.magnifyingglass", md: "manage_search" }} title="My Inquiries" value={conversations.data?.count ?? ""} onPress={() => router.navigate("/messages")} />
        <MenuRow icon={{ sf: "heart", md: "favorite_border" }} title="Saved Companies" value={saved.length} onPress={() => router.navigate("/saved")} />
        <MenuRow icon={{ sf: "envelope.open", md: "drafts" }} title="Messages" value={unread || ""} onPress={() => router.navigate("/messages")} />
        <MenuRow icon={{ sf: "gearshape", md: "settings" }} title="Settings" onPress={() => router.push("/settings")} />
        <MenuRow icon={{ sf: "globe", md: "language" }} title="Language" value={currentLanguage.name} onPress={() => setLanguage(true)} />
        <MenuRow icon={{ sf: "questionmark.circle", md: "help_outline" }} title="Help & Support" onPress={() => router.push("/help")} />
        <MenuRow icon={{ sf: "rectangle.portrait.and.arrow.right", md: "logout" }} title="Log Out" danger last onPress={confirmSignOut} />
      </View>

      <LanguageSheet visible={language} onClose={() => setLanguage(false)} />
    </ScrollView>
  );
}
