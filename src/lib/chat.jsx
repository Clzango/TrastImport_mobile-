import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, getTokens, refreshSession, WS_URL } from "./api";
import { useAuth } from "./auth";
import { keys } from "./query-keys";

// Live chat: one WebSocket per signed-in session carries every conversation. Messages are sent
// over REST (simpler error handling); the socket delivers new messages, read receipts and typing.

const ChatContext = createContext(null);
const TYPING_SHOWN_MS = 4000;
const TYPING_SEND_EVERY_MS = 2500;

/** Adds messages to a conversation's cached history, oldest first, without duplicates. */
export function mergeMessages(queryClient, conversationId, incoming) {
  queryClient.setQueryData(keys.messages(conversationId), (old) => {
    if (!old) return old;
    const byId = new Map(old.map((m) => [m.id, m]));
    for (const m of incoming) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => a.id - b.id);
  });
}

export function ChatProvider({ children }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState({});
  // conversation id -> whether the other side has the app open (from "presence" events)
  const [online, setOnline] = useState({});
  const typingTimers = useRef({});
  const lastTypingSent = useRef({});

  useEffect(() => {
    if (status !== "signedIn") return;
    let closed = false;
    let retry = 0;
    let retryTimer = null;

    const catchUp = () => {
      // After a reconnect, fetch whatever arrived while the socket was down.
      queryClient.invalidateQueries({ queryKey: keys.conversations });
      for (const query of queryClient.getQueryCache().findAll({ queryKey: ["messages"] })) {
        const [, id] = query.queryKey;
        const last = query.state.data?.at(-1);
        if (last) api.chat.messages(id, { after: last.id, limit: 100 }).then((m) => mergeMessages(queryClient, id, m), () => {});
      }
    };

    const connect = () => {
      const token = getTokens()?.access;
      if (!token || closed) return;
      const ws = new WebSocket(WS_URL);
      socket.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }));
      ws.onmessage = (e) => {
        let event;
        try {
          event = JSON.parse(e.data);
        } catch {
          return;
        }
        switch (event.type) {
          case "auth.ok":
            retry = 0;
            setConnected(true);
            catchUp();
            break;
          case "message.new":
          case "message.ack": {
            const m = event.message;
            mergeMessages(queryClient, m.conversation, [m]);
            queryClient.invalidateQueries({ queryKey: keys.conversations });
            setTyping((t) => ({ ...t, [m.conversation]: undefined }));
            break;
          }
          case "conversation.read":
            queryClient.setQueryData(keys.conversation(event.conversation), (c) =>
              c && c.my_side !== event.side ? { ...c, other_last_read_at: event.read_at } : c,
            );
            queryClient.invalidateQueries({ queryKey: keys.conversations });
            break;
          case "typing":
            clearTimeout(typingTimers.current[event.conversation]);
            setTyping((t) => ({ ...t, [event.conversation]: event.side }));
            typingTimers.current[event.conversation] = setTimeout(
              () => setTyping((t) => ({ ...t, [event.conversation]: undefined })),
              TYPING_SHOWN_MS,
            );
            break;
          case "presence":
            setOnline((o) => ({ ...o, [event.conversation]: !!event.online }));
            break;
          case "error":
            if (event.code === "token_expired" || event.code === "not_authenticated") refreshSession().catch(() => {});
            break;
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (socket.current === ws) socket.current = null;
        if (closed) return;
        // Back off up to 30 s; a fresh token is fetched on the next REST call if needed.
        const delay = Math.min(30_000, 1000 * 2 ** retry++);
        retryTimer = setTimeout(async () => {
          await refreshSession().catch(() => {});
          connect();
        }, delay);
      };
    };

    connect();
    // Phones drop sockets in the background; reconnect when the app comes back.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && !socket.current) {
        clearTimeout(retryTimer);
        retry = 0;
        connect();
      }
    });

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      sub.remove();
      socket.current?.close();
      socket.current = null;
      setConnected(false);
    };
  }, [status, queryClient]);

  const send = useCallback((event) => {
    const ws = socket.current;
    if (ws?.readyState === 1) ws.send(JSON.stringify(event));
  }, []);

  const value = useMemo(
    () => ({
      connected,
      typing,
      online,
      sendTyping: (conversation) => {
        const now = Date.now();
        if (now - (lastTypingSent.current[conversation] ?? 0) < TYPING_SEND_EVERY_MS) return;
        lastTypingSent.current[conversation] = now;
        send({ type: "typing", conversation });
      },
    }),
    [connected, typing, online, send],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
}

export function useChat() {
  const ctx = use(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}

export function useConversations() {
  const { status } = useAuth();
  return useQuery({
    queryKey: keys.conversations,
    queryFn: () => api.chat.conversations(),
    enabled: status === "signedIn",
  });
}

/** Unread messages across conversations, for the tab badge. */
export function useUnreadCount() {
  const conversations = useConversations();
  return conversations.data?.results.reduce((n, c) => n + (c.unread_count ?? 0), 0) ?? 0;
}

/** The other party's name: the company for buyers, the buyer for company owners. */
export function conversationTitle(c) {
  return c.my_side === "company" ? c.user_name || "Customer" : c.company.name;
}
