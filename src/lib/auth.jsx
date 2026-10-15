import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, onSessionExpired, setTokens } from "./api";
import { loadTokens } from "./token-storage";

const AuthContext = createContext(null);

WebBrowser.maybeCompleteAuthSession();

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  const finishSignIn = useCallback(
    async (tokens) => {
      setTokens(tokens);
      const me = await api.auth.me();
      queryClient.clear();
      setUser(me);
      setStatus("signedIn");
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    setTokens(null);
    queryClient.clear();
    setUser(null);
    setStatus("signedOut");
  }, [queryClient]);

  useEffect(() => {
    onSessionExpired(() => {
      queryClient.clear();
      setUser(null);
      setStatus("signedOut");
    });
    (async () => {
      const saved = await loadTokens();
      if (!saved) return setStatus("signedOut");
      try {
        await finishSignIn(saved);
      } catch (error) {
        // Offline at launch: keep the tokens and let the next request try again.
        if (error instanceof ApiError && error.status === 0) setStatus("signedIn");
        else signOut();
      }
    })();
  }, [finishSignIn, signOut, queryClient]);

  const value = useMemo(
    () => ({
      status,
      user,
      signOut,
      signIn: async (email, password) => finishSignIn(await api.auth.login(email, password)),
      signUp: async (data) => {
        await api.auth.signUp(data);
        await finishSignIn(await api.auth.login(data.email, data.password));
      },
      signInWithProvider: async (provider) => {
        const redirectUri = Linking.createURL("auth/callback");
        const { authorization_url } = await api.auth.socialUrl(provider, redirectUri);
        const result = await WebBrowser.openAuthSessionAsync(authorization_url, redirectUri);
        if (result.type !== "success") return false;
        const { queryParams } = Linking.parse(result.url);
        const code = queryParams?.code;
        const state = queryParams?.state;
        if (typeof code !== "string" || typeof state !== "string") {
          throw new ApiError(400, "The sign-in was cancelled or didn't return a code.");
        }
        const res = await api.auth.socialComplete(provider, code, state);
        await finishSignIn({ access: res.access, refresh: res.refresh });
        return true;
      },
      refreshUser: async () => setUser(await api.auth.me()),
    }),
    [status, user, signOut, finishSignIn],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Runs `action` when signed in; otherwise opens Log in, which returns here when done. */
export function useRequireAuth() {
  const { status } = useAuth();
  return useCallback(
    (action) => {
      if (status === "signedIn") action();
      else router.push("/login");
    },
    [status],
  );
}
