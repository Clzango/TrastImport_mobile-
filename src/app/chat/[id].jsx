import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { companyTags } from "@/components/company-card";
import { OptionsSheet } from "@/components/select-field";
import { RoundButton } from "@/components/shipping-ui";
import { Text, TextInput } from "@/components/text";
import { ErrorState, haptic, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { conversationTitle, mergeMessages, useChat } from "@/lib/chat";
import { chatDay, chatTime, initials } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { companyLine, deadlineText, departureTitle, METHODS, relativeDay, shortDate } from "@/lib/shipping";
import { colors } from "@/lib/theme";

const PAGE = 50;
const MAX_FILE_MB = 20;

const SHIPPING_QUOTE = "Hello, I'd like a shipping quote.\n\nFrom: \nTo: \nCargo: \nWeight / volume: \nReady date: ";
const SUPPLIER_QUOTE = "Hello, could you send me a quote?\n\nProduct: \nQuantity: \nDestination: ";

// Suggested messages above the composer. `draft` puts a template in the box instead of sending.
const QUICK_REPLIES = {
  LOG: [{ text: "Send me the warehouse address" }, { text: "Can you pick up from my supplier?" }, { text: "Request a quote", draft: SHIPPING_QUOTE }],
  SUP: [{ text: "Can I get a sample?" }, { text: "Request a quote", draft: SUPPLIER_QUOTE }, { text: "When is it ready to ship?" }],
  company: [{ text: "Thanks, I'll check and get back to you." }, { text: "Could you send your shipping details?" }],
};

function fileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(name = "", type = "") {
  if (/pdf/i.test(type) || /\.pdf$/i.test(name)) return { icon: { sf: "doc.richtext.fill", md: "picture_as_pdf" }, color: colors.danger };
  if (/sheet|excel|csv/i.test(type) || /\.(xlsx?|csv)$/i.test(name)) return { icon: { sf: "tablecells.fill", md: "table_chart" }, color: colors.success };
  if (/word|document/i.test(type) || /\.docx?$/i.test(name)) return { icon: { sf: "doc.text.fill", md: "description" }, color: colors.sea };
  return { icon: { sf: "doc.fill", md: "draft" }, color: colors.secondaryLabel };
}

function Attachment({ file }) {
  const isImage = /^image\//.test(file.content_type ?? "") || /\.(png|jpe?g|gif|webp|heic)$/i.test(file.name ?? "");
  const open = () => file.url && WebBrowser.openBrowserAsync(file.url, { controlsColor: colors.accent });
  if (isImage && file.url) {
    return (
      <Pressable onPress={open} accessibilityRole="imagebutton" accessibilityLabel={file.name ?? "Photo"} style={{ width: 220, height: 160, borderRadius: 16, overflow: "hidden", backgroundColor: colors.fill }}>
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
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minWidth: 220, maxWidth: 280, padding: 14, borderRadius: 16, backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
    >
      <Icon name={icon} size={34} color={color} />
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: colors.label }}>
          {file.name ?? "File"}
        </Text>
        <Text style={{ fontSize: 13, color: colors.tertiaryLabel }}>{fileSize(file.size) || "Tap to open"}</Text>
      </View>
    </Pressable>
  );
}

function MessageRow({ message, mine, read, pending, failed, onRetry }) {
  const time = failed ? "Not sent · tap to retry" : pending ? "Sending…" : `${mine ? (read ? "Read " : "Sent ") : ""}${chatTime(message.created_at, { clock: true })}`;
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", paddingHorizontal: 16, paddingVertical: 6, gap: 6 }}>
      {message.body ? (
        <Pressable
          disabled={!failed}
          onPress={onRetry}
          style={{
            maxWidth: "84%",
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 24,
            borderCurve: "continuous",
            borderBottomRightRadius: mine ? 6 : 24,
            borderBottomLeftRadius: mine ? 24 : 6,
            backgroundColor: mine ? colors.navy : colors.cell,
            borderWidth: mine ? 0 : 1,
            borderColor: colors.border,
            opacity: pending ? 0.7 : 1,
          }}
        >
          <Text selectable style={{ fontSize: 18, lineHeight: 26, color: mine ? colors.onNavy : colors.label }}>
            {message.body}
          </Text>
        </Pressable>
      ) : null}
      {message.attachment ? <Attachment file={message.attachment} /> : null}
      <Pressable disabled={!failed} onPress={onRetry}>
        <Text style={{ fontSize: 14, color: failed ? colors.danger : colors.tertiaryLabel }}>{time}</Text>
      </Pressable>
    </View>
  );
}

function DaySeparator({ iso }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 12 }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.segment }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondaryLabel }}>{chatDay(iso)}</Text>
      </View>
    </View>
  );
}

/** White strip under the header: what the conversation is about (next departure, or main product). */
function ContextStrip({ icon, title, subtitle, action, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? colors.fill : colors.cell, borderBottomWidth: 1, borderBottomColor: colors.border })}
    >
      <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: icon.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon.name} size={26} color={icon.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700", color: colors.label }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 15, color: colors.secondaryLabel }}>
          {subtitle}
        </Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.accent }}>{action}</Text>
    </Pressable>
  );
}

/** "Next departure to Brazil · Dragon Express · flight tomorrow", shown in supplier chats. */
function DepartureSuggestion({ departure: d }) {
  const air = d.method !== "SEA";
  return (
    <Pressable
      onPress={() => router.push(`/company/${d.company}`)}
      accessibilityRole="link"
      style={({ pressed }) => ({ marginHorizontal: 16, marginVertical: 8, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accentBorder, backgroundColor: pressed ? colors.accentSoft : colors.cell })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" }}>
        <Icon name={METHODS[d.method]?.icon} size={24} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>Next departure to {d.destination}</Text>
        <Text numberOfLines={2} style={{ fontSize: 17, fontWeight: "700", color: colors.label }}>
          {d.company_info?.name} · {air ? "flight" : "ship"} {relativeDay(d.departure_date).toLowerCase()}
        </Text>
      </View>
      <Icon name={{ sf: "chevron.right", md: "chevron_right" }} size={16} color={colors.accent} weight="semibold" />
    </Pressable>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { typing, online, sendTyping } = useChat();
  const { status: authStatus } = useAuth();
  const [draft, setDraft] = useState(typeof params.draft === "string" ? params.draft : "");
  const [pending, setPending] = useState([]); // { key, body, file?, failed }
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [noOlder, setNoOlder] = useState(false);
  const [menu, setMenu] = useState(false);
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
  const buyer = c?.my_side === "user";
  const companyId = c?.company?.id;
  const shippingChat = c?.company?.company_type === "LOG";

  // Details for the header line and the strip under it.
  const company = useQuery({ queryKey: keys.company(companyId), queryFn: () => api.companies.get(companyId), enabled: !!companyId && buyer });
  const companyDepartures = useQuery({
    queryKey: keys.departures({ company: companyId, open_only: true }),
    queryFn: () => api.departures.list({ company: companyId, open_only: true }),
    enabled: !!companyId && buyer && shippingChat,
  });
  // In supplier chats, suggest the next departure to the buyer's country.
  const customer = useQuery({ queryKey: keys.customer, queryFn: api.customer.me, enabled: authStatus === "signedIn" && buyer && !shippingChat });
  const country = customer.data?.country_code;
  const suggestion = useQuery({
    queryKey: keys.departures({ destination: country, open_only: true }),
    queryFn: () => api.departures.list({ destination: country, open_only: true }),
    enabled: !!country && buyer && !shippingChat,
  });

  const list = useMemo(() => messages.data ?? [], [messages.data]);
  const nextDeparture = [...(companyDepartures.data?.results ?? [])].sort((a, b) => a.departure_date.localeCompare(b.departure_date))[0];
  const suggested = [...(suggestion.data?.results ?? [])].sort((a, b) => a.departure_date.localeCompare(b.departure_date))[0];

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

  const fillTemplate = (text) => {
    setDraft(text);
    setTimeout(() => input.current?.focus(), 300);
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
  const verified = buyer && c.company.is_verified;
  const subtitle = otherTyping ? "Typing…" : isOnline ? "Online" : buyer ? (company.data ? companyLine(company.data) : shippingChat ? "Shipping company" : "Supplier") : `Customer · ${c.company.name}`;
  const subtitleColor = otherTyping ? colors.amberText : verified || isOnline ? colors.onNavySuccess : colors.onNavySecondary;
  const readUpTo = c.other_last_read_at ? new Date(c.other_last_read_at).getTime() : 0;
  const isMine = (m) => m.sender_side === c.my_side;
  const quickReplies = buyer ? QUICK_REPLIES[shippingChat ? "LOG" : "SUP"] : QUICK_REPLIES.company;
  const product = company.data && !shippingChat ? companyTags(company.data, 1)[0] : null;
  const menuOptions = [
    ...(buyer ? [{ value: "company", label: "View company profile", icon: { sf: "building.2", md: "domain" } }] : []),
    ...(buyer && shippingChat ? [{ value: "estimate", label: "Estimate shipping cost", icon: { sf: "function", md: "calculate" } }] : []),
    ...(buyer ? [{ value: "quote", label: "Request a quote", icon: { sf: "doc.text", md: "request_quote" } }] : []),
    { value: "file", label: "Send a file", icon: { sf: "paperclip", md: "attach_file" } },
  ];

  let strip = null;
  if (buyer && shippingChat && nextDeparture) {
    strip = (
      <ContextStrip
        icon={{ name: METHODS[nextDeparture.method]?.icon, bg: colors.accentTint, fg: colors.accent }}
        title={departureTitle(nextDeparture)}
        subtitle={`Departs ${shortDate(nextDeparture.departure_date)}, drop off by ${deadlineText(nextDeparture.dropoff_deadline)}`}
        action="Estimate"
        onPress={() => router.push(`/calculator/${companyId}`)}
      />
    );
  } else if (buyer && product) {
    strip = (
      <ContextStrip
        icon={{ name: { sf: "photo", md: "image" }, bg: colors.infoSoft, fg: colors.label }}
        title={product}
        subtitle={company.data.moq ? `Min. order ${Number(company.data.moq).toLocaleString()} pcs` : "Main product"}
        action="View"
        onPress={() => router.push(`/company/${companyId}`)}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.groupedBackground }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 12, backgroundColor: colors.navy }}>
        <RoundButton icon={{ sf: "arrow.left", md: "arrow_back" }} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/messages"))} />
        <Pressable onPress={() => buyer && router.push(`/company/${companyId}`)} disabled={!buyer} accessibilityRole={buyer ? "link" : undefined} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 19, fontWeight: "700", color: colors.navy }}>{initials(title)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} accessibilityRole="header" style={{ fontSize: 21, fontWeight: "700", color: colors.onNavy }}>
              {title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {verified && !otherTyping ? <Icon name={{ sf: "checkmark.shield", md: "verified_user" }} size={15} color={colors.onNavySuccess} /> : null}
              {isOnline && !verified && !otherTyping ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online }} /> : null}
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, color: subtitleColor }}>
                {subtitle}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Conversation menu" hitSlop={8} style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon name={{ sf: "ellipsis", md: "more_vert" }} size={22} color={colors.onNavy} weight="bold" />
        </Pressable>
      </View>

      {strip}

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
          // Inverted: the header sits under the newest message.
          ListHeaderComponent={suggested && list.length > 0 ? <DepartureSuggestion departure={suggested} /> : null}
          ListFooterComponent={loadingOlder ? <ActivityIndicator style={{ padding: 12 }} color={colors.accent} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8, transform: [{ scaleY: -1 }] }}>
              <Icon name={{ sf: "bubble.left.and.bubble.right", md: "forum" }} size={32} color={colors.tertiaryLabel} />
              <Text style={{ fontSize: 17, textAlign: "center", color: colors.secondaryLabel }}>
                Say hello to {title}. Ask about {shippingChat ? "routes, prices and the next departure" : "products, prices, MOQ or shipping"}.
              </Text>
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
          <Text style={{ fontSize: 14, color: colors.danger }}>{notice}</Text>
        </Pressable>
      ) : null}

      {/* Quick replies + composer */}
      <View style={{ backgroundColor: colors.cell, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 12), gap: 14 }}>
        {!draft && (
          <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {quickReplies.map((q) => (
              <Pressable
                key={q.text}
                onPress={() => (q.draft ? fillTemplate(q.draft) : queue(q.text))}
                accessibilityRole="button"
                accessibilityHint={q.draft ? "Fills in a message to complete" : "Sends this message"}
                style={({ pressed }) => ({ height: 48, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, justifyContent: "center", backgroundColor: pressed ? colors.fill : colors.cell })}
              >
                <Text style={{ fontSize: 17, color: colors.bodyText }}>{q.text}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 16 }}>
          <Pressable onPress={attach} accessibilityRole="button" accessibilityLabel="Attach a file" style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.segment : colors.fill })}>
            <Icon name={{ sf: "paperclip", md: "attach_file" }} size={24} color={colors.secondaryLabel} />
          </Pressable>
          <TextInput
            ref={input}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              if (text) sendTyping(id);
            }}
            placeholder="Write a message"
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
            style={{ flex: 1, minHeight: 56, maxHeight: 140, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16, borderRadius: 28, backgroundColor: colors.fill, fontSize: 18, color: colors.label, outlineWidth: 0 }}
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, backgroundColor: pressed ? colors.accentPressed : colors.accent, opacity: draft.trim() ? 1 : 0.5, alignItems: "center", justifyContent: "center" })}
          >
            <Icon name={{ sf: "paperplane", md: "send" }} size={24} color={colors.onAccent} />
          </Pressable>
        </View>
      </View>

      <OptionsSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={title}
        options={menuOptions}
        value={null}
        onChange={(v) => {
          if (v === "company") router.push(`/company/${companyId}`);
          if (v === "estimate") router.push(`/calculator/${companyId}`);
          if (v === "file") setTimeout(attach, 300);
          if (v === "quote") fillTemplate(shippingChat ? SHIPPING_QUOTE : SUPPLIER_QUOTE);
        }}
      />
    </KeyboardAvoidingView>
  );
}
