export const companyTypeLabel = {
  SUP: "Supplier",
  LOG: "Shipping",
};

export const addressTypeLabel = {
  HEADQUARTERS: "Headquarters",
  BRANCH: "Branch",
  WAREHOUSE: "Warehouse / pickup point",
  OFFICE: "Office",
};

export const statusLabel = {
  PENDING: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function ratingValue(rating) {
  if (rating === null || rating === undefined || rating === "") return null;
  const n = Number(rating);
  return Number.isFinite(n) ? n : null;
}

export function formatRating(rating) {
  const n = ratingValue(rating);
  return n === null ? "New" : n.toFixed(1);
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return formatDate(iso);
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function pluralize(n, word, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}

// Hermes doesn't ship Intl.DisplayNames, so native falls back to the API's English name.
const regionNames = typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(undefined, { type: "region" }) : null;

/** Short, localized country name for an ISO code ("US" → "United States"), else `fallback`. */
export function countryName(code, fallback = code) {
  try {
    return regionNames?.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Flag emoji for an ISO 3166 alpha-2 code ("CN" → 🇨🇳). */
export function countryFlag(code) {
  if (!/^[A-Z]{2}$/i.test(code ?? "")) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Chat list/bubble time: "10:24" today, "Mon" this week, else "Mar 4". */
export function chatTime(iso, { clock = false } = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (clock || d.toDateString() === now.toDateString()) return time;
  const days = (now - d) / 86_400_000;
  if (days < 6) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Day separator in a chat: "Today", "Yesterday" or "March 4, 2026". */
export function chatDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
