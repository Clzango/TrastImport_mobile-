import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OptionsSheet } from "@/components/select-field";
import { Text, TextInput } from "@/components/text";
import { ErrorState, haptic, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { conversationTitle, mergeMessages, useChat } from "@/lib/chat";
import { chatDay, chatTime, companyTypeLabel, initials } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

const PAGE = 50;
const MINE = "#2F6FE4";
const THEIRS = "#EEF1F5";
const MAX_FILE_MB = 20;
const QUICK_EMOJI = ["👍", "🙏", "😊", "👌", "✅", "📦", "🚢", "✈️", "💰", "📄", "❓", "🎉"];

function fileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(name = "", type = "") {
  if (/pdf/i.test(type) || /\.pdf$/i.test(name)) return { icon: { sf: "doc.richtext.fill", md: "picture_as_pdf" }, color: "#E5484D" };
  if (/sheet|excel|csv/i.test(type) || /\.(xlsx?|csv)$/i.test(name)) return { icon: { sf: "tablecells.fill", md: "table_chart" }, color: "#1F8A5B" };
  if (/word|document/i.test(type) || /\.docx?$/i.test(name)) return { icon: { sf: "doc.text.fill", md: "description" }, color: MINE };
  return { icon: { sf: "doc.fill", md: "draft" }, color: colors.secondaryLabel };
}

function Attachment({ file, mine }) {
  const isImage = /^image\//.test(file.content_type ?? "") || /\.(png|jpe?g|gif|webp|heic)$/i.test(file.name ?? "");
  const open = () => file.url && WebBrowser.openBrowserAsync(file.url, { controlsColor: colors.accent });
  if (isImage && file.url) {
    return (
      <Pressable onPress={open} accessibilityRole="imagebutton" accessibilityLabel={file.name ?? "Photo"} style={{ width: 220, height: 160, borderRadius: 14, overflow: "hidden", backgroundColor: THEIRS }}>
        <Image source={{ uri: file.url }} contentFit="cover" style={{ flex: 1 }} />
      </Pressable>
    );
  }
  const { icon, color } = fileIcon(file.name, file.content_type);
  return (
    <Pressable
      onPress={open}
      disabled={!file.url}
      accessibilityRole="link"
      accessibilityLabel={`${file.name}, ${fileSize(file.size)}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minWidth: 220,
        maxWidth: 280,
        padding: 14,
        borderRadius: 14,
        backgroundColor: colors.cell,
        borderWidth: 1,
        borderColor: mine ? "#D6E2FA" : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={icon} size={34} color={color} />
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: colors.label }}>
          {file.name ?? "File"}
        </Text>
        <Text style={{ fontSize: 12, color: colors.tertiaryLabel }}>{fileSize(file.size) || "Tap to open"}</Text>
      </View>
    </Pressable>
  );
}

function MessageRow({ message, mine, read, pending, failed, onRetry }) {
  const time = failed ? "Not sent · tap to retry" : pending ? "Sending…" : chatTime(message.created_at, { clock: true });
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", paddingHorizontal: 16, paddingVertical: 5, gap: 6 }}>
      {message.body ? (
        <Pressable
          disabled={!failed}
          onPress={onRetry}
          style={{
            maxWidth: "80%",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 18,
            borderCurve: "continuous",
            borderTopRightRadius: mine ? 18 : 18,
            borderBottomRightRadius: mine ? 4 : 18,
            borderBottomLeftRadius: mine ? 18 : 4,
            backgroundColor: mine ? MINE : THEIRS,
            opacity: pending ? 0.7 : 1,
          }}
        >
          <Text selectable style={{ fontSize: 15, lineHeight: 22, color: mine ? "#FFFFFF" : colors.label }}>
            {message.body}
          </Text>
        </Pressable>
      ) : null}
      {message.attachment ? <Attachment file={message.attachment} mine={mine} /> : null}
      <Pressable disabled={!failed} onPress={onRetry} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 11, color: failed ? colors.danger : colors.tertiaryLabel }}>{time}</Text>
        {mine && !pending && !failed && (
          <Icon name={read ? { sf: "checkmark.circle.fill", md: "done_all" } : { sf: "checkmark", md: "check" }} size={12} color={read ? MINE : colors.tertiaryLabel} weight="bold" />
        )}
      </Pressable>
    </View>
  );
}

function DaySeparator({ iso }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.tertiaryLabel }}>{chatDay(iso)}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { typing, online, sendTyping } = useChat();
  const [draft, setDraft] = useState(typeof params.draft === "string" ? params.draft : "");
  const [pending, setPending] = useState([]); // { key, body, file?, failed }
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [noOlder, setNoOlder] = useState(false);
  const [menu, setMenu] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [notice, setNotice] = useState(null);
  const input = useRef(null);
  const lastReadId = useRef(0);

  const conversation = useQuery({ queryKey: keys.conversation(id), queryFn: () => api.chat.conversation(id) });
  const messages = useQuery({
    queryKey: keys.messages(id),
    queryFn: () => api.chat.messages(id, { limit: PAGE }),
    // The socket keeps this fresh; don't refetch and drop older pages.
    staleTime: Infinity,
  });
  const c = conversation.data;
  const list = messages.data ?? [];

  // Mark as read when the newest message is from the other side.
  const newest = list.at(-1);
  useEffect(() => {
    if (!c || !newest || newest.sender_side === c.my_side || newest.id <= lastReadId.current) return;
    lastReadId.current = newest.id;
    api.chat.read(id).then(() => queryClient.invalidateQueries({ queryKey: keys.conversations }), () => {});
  }, [c, newest, id, queryClient]);

  const send = useMutation({
    mutationFn: ({ body, file }) => (file ? api.chat.sendFile(id, body, file) : api.chat.send(id, body)),
    onSuccess: (message, { key }) => {
      mergeMessages(queryClient, id, [message]);
      setPending((p) => p.filter((m) => m.key !== key));
      queryClient.invalidateQueries({ queryKey: keys.conversations });
    },
    onError: (e, { key }) => {
      setPending((p) => p.map((m) => (m.key === key ? { ...m, failed: true } : m)));
      setNotice(errorMessage(e));
    },
  });

  const queue = (body, file) => {
    haptic();
    const key = `${Date.now()}${Math.random()}`;
    setPending((p) => [...p, { key, body, file }]);
    setNotice(null);
    send.mutate({ key, body, file });
  };

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setEmoji(false);
    queue(body);
  };

  const attach = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_FILE_MB * 1024 * 1024) {
      setNotice(`Files can be up to ${MAX_FILE_MB} MB.`);
      return;
    }
    const file = { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream", size: asset.size };
    const body = draft.trim();
    setDraft("");
    queue(body, file);
  };

  const retry = (m) => {
    setPending((p) => p.map((x) => (x.key === m.key ? { ...x, failed: false } : x)));
    send.mutate({ key: m.key, body: m.body, file: m.file });
  };

  const loadOlder = async () => {
    const first = list[0];
    if (!first || loadingOlder || noOlder || list.length < PAGE) return;
    setLoadingOlder(true);
    try {
      const older = await api.chat.messages(id, { before: first.id, limit: PAGE });
      if (older.length < PAGE) setNoOlder(true);
      mergeMessages(queryClient, id, older);
    } catch {
      // Scrolling up again retries.
    } finally {
      setLoadingOlder(false);
    }
  };

  // Newest first for the inverted list, with a day label before each day's first message.
  const rows = useMemo(() => {
    const items = [
      ...list.map((m) => ({ type: "message", key: `m${m.id}`, message: m })),
      ...pending.map((p) => ({
        type: "pending",
        key: `p${p.key}`,
        pending: p,
        message: { body: p.body, created_at: new Date().toISOString(), attachment: p.file ? { name: p.file.name, size: p.file.size, content_type: p.file.type } : null },
      })),
    ];
    const out = [];
    for (let i = items.length - 1; i >= 0; i--) {
      out.push(items[i]);
      const day = new Date(items[i].message.created_at).toDateString();
      const prevDay = i > 0 ? new Date(items[i - 1].message.created_at).toDateString() : null;
      if (day !== prevDay) out.push({ type: "day", key: `d${day}`, iso: items[i].message.created_at });
    }
    return out;
  }, [list, pending]);

  if (conversation.isPending) return <Loading />;
  if (conversation.isError) return <ErrorState message={errorMessage(conversation.error)} onRetry={() => conversation.refetch()} />;

  const title = conversationTitle(c);
  const otherTyping = typing[id] && typing[id] !== c.my_side;
  const isOnline = online[id];
  const status = otherTyping
    ? "Typing…"
    : isOnline
      ? "Online"
      : c.my_side === "company"
        ? `Customer · ${c.company.name}`
        : `${companyTypeLabel[c.company.company_type] ?? "Company"}${c.company.is_verified ? " · Verified" : ""}`;
  const readUpTo = c.other_last_read_at ? new Date(c.other_last_read_at).getTime() : 0;
  const isMine = (m) => m.sender_side === c.my_side;
  const menuOptions = [
    ...(c.my_side === "user" ? [{ value: "company", label: "View company profile", icon: { sf: "building.2", md: "domain" } }] : []),
    ...(c.my_side === "user" ? [{ value: "quote", label: "Request a quote", icon: { sf: "doc.text", md: "request_quote" } }] : []),
    { value: "file", label: "Send a file", icon: { sf: "paperclip", md: "attach_file" } },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cell }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 8, backgroundColor: colors.cell, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/messages"))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name={{ sf: "arrow.left", md: "arrow_back" }} size={22} color={colors.label} weight="semibold" />
        </Pressable>
        <Pressable
          onPress={() => c.my_side === "user" && router.push(`/company/${c.company.id}`)}
          disabled={c.my_side !== "user"}
          accessibilityRole={c.my_side === "user" ? "link" : undefined}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#E6EBF2", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.label }}>{initials(title)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} accessibilityRole="header" style={{ fontSize: 16, fontWeight: "800", color: colors.label }}>
              {title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {(isOnline || otherTyping) && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22A45D" }} />}
              <Text numberOfLines={1} style={{ fontSize: 12, color: otherTyping ? colors.accent : colors.secondaryLabel }}>
                {status}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Conversation menu" hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name={{ sf: "line.3.horizontal", md: "menu" }} size={22} color={colors.label} />
        </Pressable>
      </View>

      {/* Messages */}
      {messages.isPending ? (
        <Loading />
      ) : messages.isError ? (
        <ErrorState message={errorMessage(messages.error)} onRetry={() => messages.refetch()} />
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => r.key}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingOlder ? <ActivityIndicator style={{ padding: 12 }} color={colors.accent} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8, transform: [{ scaleY: -1 }] }}>
              <Icon name={{ sf: "bubble.left.and.bubble.right", md: "forum" }} size={32} color={colors.tertiaryLabel} />
              <Text style={{ fontSize: 15, textAlign: "center", color: colors.secondaryLabel }}>Say hello to {title}. Ask about products, prices, MOQ or shipping.</Text>
            </View>
          }
          renderItem={({ item }) =>
            item.type === "day" ? (
              <DaySeparator iso={item.iso} />
            ) : item.type === "pending" ? (
              <MessageRow message={item.message} mine pending={!item.pending.failed} failed={item.pending.failed} onRetry={() => retry(item.pending)} />
            ) : (
              <MessageRow message={item.message} mine={isMine(item.message)} read={isMine(item.message) && new Date(item.message.created_at).getTime() <= readUpTo} />
            )
          }
        />
      )}

      {notice ? (
        <Pressable onPress={() => setNotice(null)} style={{ marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.dangerSoft }}>
          <Text style={{ fontSize: 13, color: colors.danger }}>{notice}</Text>
        </Pressable>
      ) : null}

      {emoji && (
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }} style={{ flexGrow: 0, borderTopWidth: 1, borderTopColor: colors.separator, paddingVertical: 6 }}>
          {QUICK_EMOJI.map((e) => (
            <Pressable key={e} onPress={() => (setDraft((d) => d + e), sendTyping(id))} accessibilityLabel={`Insert ${e}`} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.fill : "transparent" })}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Composer */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 10, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.cell }}>
        <Pressable onPress={attach} accessibilityRole="button" accessibilityLabel="Attach a file" hitSlop={6} style={{ width: 40, height: 48, alignItems: "center", justifyContent: "center" }}>
          <Icon name={{ sf: "paperclip", md: "attach_file" }} size={22} color={colors.secondaryLabel} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cell, paddingLeft: 16, paddingRight: 4 }}>
          <TextInput
            ref={input}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              if (text) sendTyping(id);
            }}
            placeholder="Type a message..."
            placeholderTextColor={colors.tertiaryLabel}
            selectionColor={colors.accent}
            multiline
            maxLength={4000}
            accessibilityLabel="Message"
            onKeyPress={(e) => {
              // Enter sends on web; Shift+Enter adds a line.
              if (process.env.EXPO_OS === "web" && e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            style={{ flex: 1, minHeight: 46, maxHeight: 120, paddingTop: 13, paddingBottom: 13, fontSize: 15, color: colors.label, outlineWidth: 0 }}
          />
          <Pressable onPress={() => setEmoji((v) => !v)} accessibilityRole="button" accessibilityLabel="Emoji" accessibilityState={{ expanded: emoji }} hitSlop={4} style={{ width: 40, height: 46, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "face.smiling", md: "sentiment_satisfied" }} size={22} color={emoji ? colors.accent : colors.secondaryLabel} />
          </Pressable>
        </View>
        <Pressable
          onPress={submit}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: pressed ? colors.accentPressed : "#F07A26",
            opacity: draft.trim() ? 1 : 0.5,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={22} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      <OptionsSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={title}
        options={menuOptions}
        value={null}
        onChange={(v) => {
          if (v === "company") router.push(`/company/${c.company.id}`);
          if (v === "file") setTimeout(attach, 300);
          if (v === "quote") {
            setDraft(
              c.company.company_type === "LOG"
                ? "Hello, I'd like a shipping quote.\n\nFrom: \nTo: \nCargo: \nWeight / volume: \nReady date: "
                : "Hello, could you send me a quote?\n\nProduct: \nQuantity: \nDestination: ",
            );
            setTimeout(() => input.current?.focus(), 300);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}
