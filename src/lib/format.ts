import type { AddressType, CompanyType, ReviewStatus } from "./types";

export const companyTypeLabel: Record<CompanyType, string> = {
  SUP: "Supplier",
  LOG: "Shipping",
};

export const addressTypeLabel: Record<AddressType, string> = {
  HEADQUARTERS: "Headquarters",
  BRANCH: "Branch",
  WAREHOUSE: "Warehouse / pickup point",
  OFFICE: "Office",
};

export const statusLabel: Record<ReviewStatus, string> = {
  PENDING: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function ratingValue(rating: number | string | null | undefined) {
  if (rating === null || rating === undefined || rating === "") return null;
  const n = Number(rating);
  return Number.isFinite(n) ? n : null;
}

export function formatRating(rating: number | string | null | undefined) {
  const n = ratingValue(rating);
  return n === null ? "New" : n.toFixed(1);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return formatDate(iso);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}
