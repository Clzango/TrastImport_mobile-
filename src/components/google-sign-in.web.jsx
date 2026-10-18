import { useEffect, useRef } from "react";
import { View } from "react-native";

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let script = null;

function loadGoogleIdentity() {
  script ??= new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://accounts.google.com/gsi/client";
    el.async = true;
    el.onload = () => resolve(window.google);
    el.onerror = () => {
      script = null;
      reject(new Error("Couldn't load Google sign-in. Check your connection and try again."));
    };
    document.head.appendChild(el);
  });
  return script;
}

/**
 * Google's own "Continue with Google" button (Google Identity Services). It hands back an ID
 * token, which the API exchanges for its own tokens at /auth/google/. Renders nothing until
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set.
 */
export function GoogleSignInButton({ onIdToken, onError }) {
  const container = useRef(null);
  const handlers = useRef({ onIdToken, onError });

  useEffect(() => {
    handlers.current = { onIdToken, onError };
  }, [onIdToken, onError]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentity().then(
      (google) => {
        if (cancelled || !container.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => handlers.current.onIdToken(credential),
        });
        google.accounts.id.renderButton(container.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(container.current.offsetWidth || 320, 400),
        });
      },
      (error) => handlers.current.onError?.(error),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return null;
  return <View ref={container} style={{ minHeight: 44, alignItems: "center" }} />;
}
