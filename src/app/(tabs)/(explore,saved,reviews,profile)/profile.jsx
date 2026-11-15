import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContainerPanel } from "@/components/container-panel";
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
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 16, backgroundColor: pressed ? colors.steel : "transparent" })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, borderCurve: "continuous", backgroundColor: danger ? colors.dangerSoft : colors.steel, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.ink} />
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch", borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: danger ? colors.danger : colors.ink }}>{title}</Text>
        {value !== undefined && value !== null && value !== "" ? <Text style={{ fontSize: 15, color: colors.inkSecondary }}>{value}</Text> : null}
        {!danger && <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={15} color={colors.faint} weight="semibold" />}
      </View>
    </Pressable>
  );
}

function Group({ title, children }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={{ marginHorizontal: 4, fontSize: 15, fontWeight: "700", color: colors.inkSecondary }}>{title}</Text> : null}
      <View style={{ backgroundColor: colors.cell, borderRadius: 20, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>{children}</View>
    </View>
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
  const openCompanies = () => router.push(owned.length === 1 ? `/manage/${owned[0]}` : "/my-companies");

  const confirmSignOut = () => {
    // Signing out swaps the app for the Welcome screen (see the root layout).
    if (process.env.EXPO_OS === "web") return signOut();
    Alert.alert("Log out?", "You'll need to log in again to use TrastImport.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: signOut },
    ]);
  };

  const stats = [
    { label: "Favorites", count: saved.length, onPress: () => router.navigate("/saved") },
    { label: "Unread", count: unread || 0, onPress: () => router.navigate("/messages") },
    { label: "Companies", count: owned.length, onPress: () => (owned.length ? openCompanies() : router.push({ pathname: "/search", params: { focus: "1" } })) },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 48, gap: 22 }}
      refreshControl={
        <RefreshControl
          refreshing={customer.isRefetching}
          onRefresh={() => {
            customer.refetch();
            conversations.refetch();
          }}
          tintColor={colors.container}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text accessibilityRole="header" style={{ fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -1.2, color: colors.ink }}>
          Profile
        </Text>
        <Pressable onPress={() => router.push("/settings")} accessibilityRole="button" accessibilityLabel="Settings" style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.steel : colors.cell, boxShadow: "0 1px 3px rgba(15,27,42,0.1)" })}>
          <Icon name={{ sf: "gearshape", md: "settings" }} size={21} color={colors.ink} />
        </Pressable>
      </View>

      {/* Identity */}
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            {c?.avatar ? (
              <Image source={{ uri: c.avatar }} contentFit="cover" style={{ width: 64, height: 64 }} accessibilityLabel="Profile photo" />
            ) : (
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.onAccent }}>{initials(name || user?.email || "?")}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: colors.ink }}>
                {name || "Your name"}
              </Text>
              {c?.country_code ? <Text style={{ fontSize: 18 }}>{countryFlag(c.country_code)}</Text> : null}
            </View>
            <Text selectable numberOfLines={1} style={{ fontSize: 14, color: colors.inkSecondary }}>
              {user?.email}
            </Text>
            {c?.is_verified && <VerifiedBadge label="Verified buyer" />}
          </View>
          <Pressable onPress={() => router.push("/edit-profile")} accessibilityRole="button" style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", borderWidth: 1, borderColor: colors.steelBorder, backgroundColor: pressed ? colors.steel : colors.cell })}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>Edit</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20, borderCurve: "continuous", backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border }}>
          {stats.map((s, i) => (
            <Pressable key={s.label} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.count} ${s.label}`} style={{ flex: 1, gap: 2, paddingLeft: i ? 14 : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.separator }}>
              <Text style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: colors.ink }}>{s.count}</Text>
              <Text style={{ fontSize: 13, color: colors.inkSecondary }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Business owners manage their listing; everyone else is invited to find and claim theirs. */}
      <Pressable onPress={owned.length ? openCompanies : () => router.push({ pathname: "/search", params: { focus: "1" } })} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        <ContainerPanel color={colors.teal} style={{ borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.3, color: colors.onAccent }}>{owned.length ? (owned.length === 1 ? "Manage your company" : "Your companies") : "Own a company?"}</Text>
            <Text style={{ fontSize: 14, color: colors.onAccent }}>{owned.length ? "Departures, prices, products and reviews" : "Find its page and request ownership"}</Text>
          </View>
          <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: "center", backgroundColor: colors.cell }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.tealInk }}>{owned.length ? "Open" : "Find it"}</Text>
          </View>
        </ContainerPanel>
      </Pressable>

      <Group title="Your activity">
        <MenuRow icon={{ sf: "text.magnifyingglass", md: "manage_search" }} title="My inquiries" value={conversations.data?.count ?? ""} onPress={() => router.navigate("/messages")} />
        <MenuRow icon={{ sf: "heart", md: "favorite_border" }} title="Favorites" value={saved.length} onPress={() => router.navigate("/saved")} />
        <MenuRow icon={{ sf: "paperplane", md: "send" }} title="Messages" value={unread || ""} onPress={() => router.navigate("/messages")} last />
      </Group>

      <Group title="App">
        <MenuRow icon={{ sf: "globe", md: "language" }} title="Language" value={currentLanguage.name} onPress={() => setLanguage(true)} />
        <MenuRow icon={{ sf: "gearshape", md: "settings" }} title="Settings" onPress={() => router.push("/settings")} />
        <MenuRow icon={{ sf: "questionmark.circle", md: "help_outline" }} title="Help and support" onPress={() => router.push("/help")} last />
      </Group>

      <Group>
        <MenuRow icon={{ sf: "rectangle.portrait.and.arrow.right", md: "logout" }} title="Log out" danger last onPress={confirmSignOut} />
      </Group>

      <LanguageSheet visible={language} onClose={() => setLanguage(false)} />
    </ScrollView>
  );
}
