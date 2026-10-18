import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { radius } from "@/lib/theme";

/**
 * Native "Sign in with Apple" button. Hands back Apple's identity token (and the name, which
 * Apple only shares on the first sign-in); the API exchanges it at /auth/apple/.
 */
export function AppleSignInButton({ onCredential, onError, style }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAvailable, () => setAvailable(false));
  }, []);

  if (!available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius.button}
      style={[{ height: 52, width: "100%" }, style]}
      onPress={async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
          });
          if (!credential.identityToken) throw new Error("Apple didn't return a sign-in token. Try again.");
          onCredential({
            idToken: credential.identityToken,
            firstName: credential.fullName?.givenName ?? "",
            lastName: credential.fullName?.familyName ?? "",
          });
        } catch (error) {
          if (error?.code !== "ERR_REQUEST_CANCELED") onError?.(error);
        }
      }}
    />
  );
}
