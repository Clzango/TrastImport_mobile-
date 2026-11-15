import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo } from "@/components/company-card";
import { Text, TextInput } from "@/components/text";
import { Avatar, Button, EmptyState, ErrorState, Icon, Loading, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { conversationTitle, useChat, useConversations } from "@/lib/chat";
import { chatTime, initials } from "@/lib/format";
import { colors } from "@/lib/theme";

function ConversationRow({ conversation: c }) {
  const { typing } = useChat();
  const unread = c.unread_count > 0;
  const title = conversationTitle(c);
  const last = c.last_message;
  const preview = typing[c.id] ? "Typing…" : last ? `${last.sender_side === c.my_side ? "You: " : ""}${last.body}` : "No messages yet";

  return (
    <Pressable
      onPress={() => router.push(`/chat/${c.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${title}${unread ? `, ${c.unread_count} unread` : ""}: ${preview}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: pressed ? colors.fill : colors.cell })}
    >
      {c.my_side === "company" ? <Avatar text={initials(title)} size={52} /> : <CompanyLogo company={c.company} size={52} />}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: unread ? "800" : "700", color: colors.label }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: unread ? colors.container : colors.tertiaryLabel, fontWeight: unread ? "700" : "500" }}>{chatTime(c.last_message_at ?? c.created_at)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {c.my_side === "user" && c.company.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={14} color={colors.teal} />}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: typing[c.id] ? colors.container : unread ? colors.ink : colors.secondaryLabel, fontWeight: unread ? "600" : "400" }}>
            {preview}
          </Text>
          {unread && (
            <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.container, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.onAccent }}>{c.unread_count > 99 ? "99+" : c.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const conversations = useConversations();
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const all = conversations.data?.results ?? [];
  const unreadCount = all.filter((c) => c.unread_count > 0).length;
  const q = query.trim().toLowerCase();
  const rows = all.filter((c) => (filter === "ALL" || c.unread_count > 0) && (!q || conversationTitle(c).toLowerCase().includes(q)));
  const filtering = filter !== "ALL" || !!q;

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <ConversationRow conversation={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 86 }} />}
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 24, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
          <PageTitle>Messages</PageTitle>
          {all.length > 0 && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 14, borderRadius: 14, borderCurve: "continuous", backgroundColor: colors.steel }}>
                <Icon name={{ sf: "magnifyingglass", md: "search" }} size={19} color={colors.inkSecondary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search conversations"
                  placeholderTextColor={colors.inkSecondary}
                  accessibilityLabel="Search conversations"
                  returnKeyType="search"
                  style={{ flex: 1, fontSize: 16, color: colors.ink, outlineWidth: 0 }}
                />
              </View>
              <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 3, borderRadius: 12, borderCurve: "continuous", backgroundColor: colors.steel }}>
                {[
                  { value: "ALL", label: "All" },
                  { value: "UNREAD", label: unreadCount ? `Unread (${unreadCount})` : "Unread" },
                ].map((f) => {
                  const selected = filter === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      onPress={() => setFilter(f.value)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      style={{ flex: 1, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.cell : "transparent", boxShadow: selected ? "0 1px 3px rgba(15,27,42,0.12)" : undefined }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: selected ? "700" : "600", color: selected ? colors.ink : colors.inkSecondary }}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        conversations.isPending ? (
          <Loading />
        ) : conversations.isError ? (
          <ErrorState message={errorMessage(conversations.error)} onRetry={() => conversations.refetch()} />
        ) : filtering ? (
          <EmptyState icon={{ sf: "magnifyingglass", md: "search" }} title="No matching conversations" message={q ? `Nothing matches "${query.trim()}". Check the spelling or clear the search.` : "You've read everything."} />
        ) : (
          <EmptyState
            icon={{ sf: "paperplane", md: "send" }}
            title="No messages yet"
            message="Contact a supplier or shipping company from its page to ask for prices, samples or a quote."
            action={<Button title="Find companies" variant="ink" onPress={() => router.navigate("/")} />}
          />
        )
      }
      refreshControl={<RefreshControl refreshing={conversations.isRefetching} onRefresh={() => conversations.refetch()} tintColor={colors.container} />}
    />
  );
}
