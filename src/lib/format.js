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
