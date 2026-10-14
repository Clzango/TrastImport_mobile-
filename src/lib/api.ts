import { mockSend } from "./mock-server";
import { clearTokens, saveTokens } from "./token-storage";
import type {
  Address,
  Claim,
  Company,
  Customer,
  LocalFile,
  Paginated,
  Review,
  ReviewPhoto,
  Tokens,
  User,
  Verification,
} from "./types";

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
/** Without EXPO_PUBLIC_API_URL the app talks to an in-memory server so every screen works offline. */
export const USE_MOCK = !API_URL;

type Query = Record<string, string | number | boolean | undefined | null>;
type FormValue = string | LocalFile | undefined;

export interface TransportRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Query;
  json?: unknown;
  form?: Record<string, FormValue>;
  token?: string;
}

export interface TransportResponse {
  status: number;
  data: any;
  retryAfter?: number;
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  retryAfter?: number;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, retryAfter?: number) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
  }
}

// ---------------------------------------------------------------------------
// Transport

function buildUrl(path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${API_URL}${path}${params ? `?${params}` : ""}`;
}

async function toFormData(form: Record<string, FormValue>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      body.append(key, value);
    } else if (process.env.EXPO_OS === "web") {
      const blob = await (await fetch(value.uri)).blob();
      body.append(key, blob, value.name);
    } else {
      // React Native's FormData accepts { uri, name, type } for files.
      body.append(key, value as unknown as Blob);
    }
  }
  return body;
}

async function httpSend(req: TransportRequest): Promise<TransportResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (req.token) headers.Authorization = `Bearer ${req.token}`;
  let body: BodyInit | undefined;
  if (req.form) {
    body = await toFormData(req.form);
  } else if (req.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(req.json);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(req.path, req.query), { method: req.method, headers, body, credentials: "include" });
  } catch {
    throw new ApiError(0, "Can't reach TrastImport. Check your connection and try again.");
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
  return { status: res.status, data, retryAfter };
}

const send = USE_MOCK ? mockSend : httpSend;

// ---------------------------------------------------------------------------
// Session

let tokens: Tokens | null = null;
let onExpired: (() => void) | null = null;
let refreshing: Promise<boolean> | null = null;

export function setTokens(next: Tokens | null) {
  tokens = next;
  if (next) saveTokens(next);
  else clearTokens();
}

export function getTokens() {
  return tokens;
}

export function onSessionExpired(handler: () => void) {
  onExpired = handler;
}

function refreshAccess(): Promise<boolean> {
  if (!tokens?.refresh) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const res = await send({ method: "POST", path: "/auth/jwt/refresh/", json: { refresh: tokens!.refresh } });
      if (res.status !== 200) return false;
      setTokens({ access: res.data.access, refresh: res.data.refresh ?? tokens!.refresh });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  return undefined;
}

function toApiError(res: TransportResponse): ApiError {
  const { status, data } = res;
  if (status === 429) {
    const wait = res.retryAfter ? ` in ${res.retryAfter} s` : " shortly";
    return new ApiError(status, `Too many attempts. Try again${wait}.`, {}, res.retryAfter);
  }
  if (status >= 500) return new ApiError(status, "TrastImport is having trouble right now. Try again in a moment.");
  if (Array.isArray(data)) return new ApiError(status, firstString(data) ?? "Something went wrong.");
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return new ApiError(status, data.detail);
    const fieldErrors: Record<string, string> = {};
    let banner = firstString(data.non_field_errors);
    for (const [key, value] of Object.entries(data)) {
      if (key === "non_field_errors") continue;
      const msg = firstString(value);
      if (msg) fieldErrors[key] = msg;
    }
    const fallback = Object.entries(fieldErrors)[0];
    banner ??= fallback ? fallback[1] : undefined;
    return new ApiError(status, banner ?? "Something went wrong.", fieldErrors);
  }
  return new ApiError(status, status === 404 ? "Not found." : "Something went wrong.");
}

interface RequestOptions {
  query?: Query;
  json?: unknown;
  form?: Record<string, FormValue>;
  /** Send the access token. Defaults to true whenever the user is signed in. */
  auth?: boolean;
}

async function request<T>(method: TransportRequest["method"], path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  const make = () => send({ method, path, query: opts.query, json: opts.json, form: opts.form, token: useAuth ? tokens?.access : undefined });

  let res = await make();
  if (res.status === 401 && useAuth && tokens) {
    if (await refreshAccess()) {
      res = await make();
    } else {
      setTokens(null);
      onExpired?.();
    }
  }
  if (res.status >= 400) throw toApiError(res);
  return res.data as T;
}

// ---------------------------------------------------------------------------
// Endpoints

export const PAGE_SIZE = 10;

export interface CompanyFilters {
  search?: string;
  company_type?: "SUP" | "LOG";
  is_verified?: boolean;
  min_rating?: number;
  ordering?: string;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<Tokens>("POST", "/auth/jwt/create/", { json: { email, password }, auth: false }),
    signUp: (data: { email: string; password: string; first_name: string; last_name: string }) =>
      request<User>("POST", "/auth/users/", { json: data, auth: false }),
    me: () => request<User>("GET", "/auth/users/me/"),
    resetPassword: (email: string) =>
      request<void>("POST", "/auth/users/reset_password/", { json: { email }, auth: false }),
    resetPasswordConfirm: (uid: string, token: string, new_password: string) =>
      request<void>("POST", "/auth/users/reset_password_confirm/", { json: { uid, token, new_password }, auth: false }),
    setPassword: (current_password: string, new_password: string) =>
      request<void>("POST", "/auth/users/set_password/", { json: { current_password, new_password } }),
    setEmail: (current_password: string, new_email: string) =>
      request<void>("POST", "/auth/users/set_email/", { json: { current_password, new_email } }),
    deleteAccount: (current_password: string) =>
      request<void>("DELETE", "/auth/users/me/", { json: { current_password } }),
    socialUrl: (provider: SocialProvider, redirect_uri: string) =>
      request<{ authorization_url: string }>("GET", `/auth/o/${provider}/`, { query: { redirect_uri }, auth: false }),
    socialComplete: (provider: SocialProvider, code: string, state: string) =>
      request<Tokens & { user: User }>("POST", `/auth/o/${provider}/`, { form: { code, state }, auth: false }),
  },

  customer: {
    me: () => request<Customer>("GET", "/apps/customers/me/"),
    update: (data: Partial<Omit<Customer, "id" | "is_verified">>) =>
      request<Customer>("PATCH", "/apps/customers/me/", { json: data }),
  },

  companies: {
    list: (filters: CompanyFilters, offset = 0) =>
      request<Paginated<Company>>("GET", "/apps/companies/", {
        query: { ...filters, limit: PAGE_SIZE, offset },
      }),
    get: (id: number) => request<Company>("GET", `/apps/companies/${id}/`),
    mine: () => request<Company[]>("GET", "/apps/companies/mine/"),
    update: (id: number, data: Partial<Company>) => request<Company>("PATCH", `/apps/companies/${id}/`, { json: data }),
    addAddress: (id: number, data: Omit<Address, "id">) =>
      request<Address>("POST", `/apps/companies/${id}/addresses/`, { json: data }),
    claim: (id: number, message: string, document?: LocalFile) =>
      request<Claim>("POST", `/apps/companies/${id}/claim/`, { form: { message, document } }),
    reviews: (id: number, offset = 0) =>
      request<Paginated<Review>>("GET", `/apps/companies/${id}/reviews/`, { query: { limit: 20, offset } }),
    createReview: (id: number, rating: number, comment: string) =>
      request<Review>("POST", `/apps/companies/${id}/reviews/`, { json: { rating, comment } }),
  },

  addresses: {
    update: (id: number, data: Partial<Address>) => request<Address>("PATCH", `/apps/addresses/${id}/`, { json: data }),
    remove: (id: number) => request<void>("DELETE", `/apps/addresses/${id}/`),
  },

  reviews: {
    // The API has no "my reviews" endpoint yet, so this fetches everyone's and filters.
    // Swap to GET /apps/reviews/mine/ once it exists.
    mine: async (userId: number) => {
      const page = await request<Paginated<Review>>("GET", "/apps/reviews/", { query: { limit: 100 } });
      return page.results.filter((r) => r.user === userId);
    },
    get: (id: number) => request<Review>("GET", `/apps/reviews/${id}/`),
    update: (id: number, data: { rating?: number; comment?: string }) =>
      request<Review>("PATCH", `/apps/reviews/${id}/`, { json: data }),
    remove: (id: number) => request<void>("DELETE", `/apps/reviews/${id}/`),
    addPhoto: (id: number, image: LocalFile) =>
      request<ReviewPhoto>("POST", `/apps/reviews/${id}/photos/`, { form: { image } }),
    removePhoto: (id: number, photoId: number) => request<void>("DELETE", `/apps/reviews/${id}/photos/${photoId}/`),
    reply: (id: number, reply: string) => request<Review>("POST", `/apps/reviews/${id}/reply/`, { json: { reply } }),
  },

  claims: {
    list: () => request<Paginated<Claim>>("GET", "/apps/claims/", { query: { limit: 100 } }),
  },

  verifications: {
    list: () => request<Paginated<Verification>>("GET", "/apps/verifications/", { query: { limit: 100 } }),
    create: (document: LocalFile, note: string) =>
      request<Verification>("POST", "/apps/verifications/", { form: { document, note } }),
  },
};

export type SocialProvider = "google-oauth2" | "weixin";

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
