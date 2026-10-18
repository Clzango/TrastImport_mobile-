import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo } from "@/components/company-card";
import { Text } from "@/components/text";
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
          <Text style={{ fontSize: 12, color: unread ? colors.accent : colors.tertiaryLabel, fontWeight: unread ? "700" : "400" }}>{chatTime(c.last_message_at ?? c.created_at)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {c.my_side === "user" && c.company.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={14} color={colors.info} />}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: typing[c.id] ? colors.accent : unread ? colors.bodyText : colors.secondaryLabel, fontWeight: unread ? "600" : "400" }}>
            {preview}
          </Text>
          {unread && (
            <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
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
  const rows = conversations.data?.results ?? [];

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <ConversationRow conversation={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 86 }} />}
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 24, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 4 }}>
          <PageTitle>Messages</PageTitle>
          <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>Your conversations with suppliers and shipping companies.</Text>
        </View>
      }
      ListEmptyComponent={
        conversations.isPending ? (
          <Loading />
        ) : conversations.isError ? (
          <ErrorState message={errorMessage(conversations.error)} onRetry={() => conversations.refetch()} />
        ) : (
          <EmptyState
            icon={{ sf: "bubble.left.and.bubble.right", md: "forum" }}
            title="No messages yet"
            message="Contact a supplier or shipping company from its page to ask for prices, samples or a quote."
            action={<Button title="Find Companies" onPress={() => router.navigate("/")} style={{ borderRadius: 999 }} />}
          />
        )
      }
      refreshControl={<RefreshControl refreshing={conversations.isRefetching} onRefresh={() => conversations.refetch()} tintColor={colors.accent} />}
    />
  );
}
