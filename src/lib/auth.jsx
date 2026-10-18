import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, isEmailNotConfirmed, onSessionExpired, setTokens } from "./api";
import { loadTokens } from "./token-storage";

const AuthContext = createContext(null);
const PROVIDER_KEY = "trastimport.signInProvider";

WebBrowser.maybeCompleteAuthSession();

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  const finishSignIn = useCallback(
    async (tokens, remember = true) => {
      setTokens(tokens, { remember });
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
      /**
       * Resolves to { otp: { ticket, email } } when the API wants the emailed code as a second
       * step (finish with verifyLoginCode), or to undefined once signed in.
       */
      signIn: async (email, password, remember = true) => {
        const res = await api.auth.login(email, password);
        if (res.otp_required) return { otp: { ticket: res.ticket, email: res.email || email } };
        await finishSignIn(res, remember);
      },
      verifyLoginCode: async (ticket, code, remember = true) => finishSignIn(await api.auth.verifyLoginCode(ticket, code), remember),
      activateWithCode: async (email, code) => finishSignIn(await api.auth.activateWithCode(email, code)),
      /** Resolves to "confirmEmail" when the account must be confirmed from the emailed link first. */
      signUp: async (data) => {
        await api.auth.signUp(data);
        try {
          await finishSignIn(await api.auth.login(data.email, data.password));
          return "signedIn";
        } catch (error) {
          if (isEmailNotConfirmed(error)) return "confirmEmail";
          throw error;
        }
      },
      signInWithGoogle: async (idToken) => finishSignIn(await api.auth.google(idToken)),
      signInWithApple: async (idToken, firstName, lastName) => finishSignIn(await api.auth.apple(idToken, firstName, lastName)),
      signInWithProvider: async (provider) => {
        const redirectUri = Linking.createURL("auth/callback");
        const { authorization_url } = await api.auth.socialUrl(provider, redirectUri);
        if (process.env.EXPO_OS === "web") {
          // A full-page redirect, since popups opened after an await get blocked. The provider
          // sends the browser back to /auth/callback, which calls completeProviderSignIn.
          globalThis.sessionStorage?.setItem(PROVIDER_KEY, provider);
          globalThis.location.assign(authorization_url);
          return new Promise(() => {}); // the page is unloading
        }
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
      /** Web only: finishes signInWithProvider after the provider redirects back with ?code&state. */
      completeProviderSignIn: async (code, state) => {
        const provider = globalThis.sessionStorage?.getItem(PROVIDER_KEY);
        globalThis.sessionStorage?.removeItem(PROVIDER_KEY);
        if (!provider) throw new ApiError(400, "This sign-in link has expired. Start again from Log In.");
        const res = await api.auth.socialComplete(provider, code, state);
        await finishSignIn({ access: res.access, refresh: res.refresh });
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
