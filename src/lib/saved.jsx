import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

// The API has no "saved companies" endpoint, so saved companies live on the device.
// A snapshot of each company is kept so the Saved tab renders offline; tapping one loads fresh data.
const KEY = "trastimport.saved-companies";

const SavedContext = createContext(null);

export function SavedProvider({ children }) {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSaved(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const toggle = useCallback((company) => {
    setSaved((prev) => {
      const next = prev.some((c) => c.id === company.id) ? prev.filter((c) => c.id !== company.id) : [company, ...prev];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ saved, toggle, isSaved: (id) => saved.some((c) => c.id === id) }),
    [saved, toggle],
  );

  return <SavedContext value={value}>{children}</SavedContext>;
}

export function useSaved() {
  const ctx = use(SavedContext);
  if (!ctx) throw new Error("useSaved must be used inside <SavedProvider>");
  return ctx;
}
