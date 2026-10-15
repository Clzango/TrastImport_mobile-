import * as SecureStore from "expo-secure-store";

// Keychain on iOS, Keystore-backed storage on Android. Web has no secure store,
// so it falls back to localStorage (development only).
const KEY = "trastimport.tokens";
const isWeb = process.env.EXPO_OS === "web";

export async function loadTokens() {
  try {
    const raw = isWeb ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens) {
  const raw = JSON.stringify(tokens);
  try {
    if (isWeb) globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {}
}

export async function clearTokens() {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
