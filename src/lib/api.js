import { clearTokens, saveTokens } from "./token-storage";

/**
 * Set EXPO_PUBLIC_API_URL to use another backend, e.g. a local one or "/api" behind the web proxy.
 * On web in dev, requests always go through the dev server's /api proxy (see metro.config.js),
 * since the API doesn't allow cross-origin calls.
 */
export const API_URL = (
  process.env.EXPO_OS === "web" && __DEV__
    ? "/api"
    : process.env.EXPO_PUBLIC_API_URL || "https://trastipmortapp-production.up.railway.app"
).replace(/\/+$/, "");

/**
 * Chat WebSocket. Vercel's /api rewrite can't carry WebSockets, so when the API is behind that
 * proxy the socket goes straight to Railway (it authenticates with a token, not cookies).
 */
export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  `${(API_URL.startsWith("http") ? API_URL : "https://trastipmortapp-production.up.railway.app").replace(/^http/, "ws")}/ws/chat/`;

export class ApiError extends Error {
  status;
  fieldErrors;
  retryAfter;
  code;

  constructor(status, message, fieldErrors = {}, retryAfter, code) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
    this.code = code;
  }
}

/** Login refused because the account's email isn't confirmed yet. */
export function isEmailNotConfirmed(error) {
  if (!(error instanceof ApiError) || error.status !== 401) return false;
  // The server doesn't put the error code in the body yet, so fall back to its message.
  return error.code === "email_not_confirmed" || error.message.startsWith("Confirm your email");
}

// ---------------------------------------------------------------------------
// Transport

function buildUrl(path, query) {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${API_URL}${path}${params ? `?${params}` : ""}`;
}

async function toFormData(form) {
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
      body.append(key, value);
    }
  }
  return body;
}

async function send(req) {
  const headers = { Accept: "application/json" };
  if (req.token) headers.Authorization = `Bearer ${req.token}`;
  let body;
  if (req.form) {
    body = await toFormData(req.form);
  } else if (req.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(req.json);
  }

  let res;
  try {
    // Auth is a Bearer token, so cookies are only needed for social login, where the server
    // keeps the OAuth state in its session. Credentialed CORS also needs CORS_ALLOW_CREDENTIALS.
    const credentials = req.path.startsWith("/auth/o/") ? "include" : "omit";
    res = await fetch(buildUrl(req.path, req.query), { method: req.method, headers, body, credentials });
  } catch {
    throw new ApiError(0, "Can't reach TrastImport. Check your connection and try again.");
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
  return { status: res.status, data, retryAfter };
}

// ---------------------------------------------------------------------------
// Session

let tokens = null;
let remember = true;
let onExpired = null;
let refreshing = null;

/** Without `remember`, the session lasts until the app is closed (tokens stay in memory only). */
export function setTokens(next, options) {
  if (options?.remember !== undefined) remember = options.remember;
  tokens = next;
  if (next && remember) saveTokens(next);
  else clearTokens();
}

export function getTokens() {
  return tokens;
}

/** Gets a new access token with the refresh token. Resolves to false if the session is over. */
export function refreshSession() {
  return refreshAccess();
}

export function onSessionExpired(handler) {
  onExpired = handler;
}

function refreshAccess() {
  if (!tokens?.refresh) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const res = await send({ method: "POST", path: "/auth/jwt/refresh/", json: { refresh: tokens.refresh } });
      if (res.status !== 200) return false;
      setTokens({ access: res.data.access, refresh: res.data.refresh ?? tokens.refresh });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function firstString(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  return undefined;
}

function toApiError(res) {
  const { status, data } = res;
  if (status === 429) {
    const wait = res.retryAfter ? ` in ${res.retryAfter} s` : " shortly";
    return new ApiError(status, `Too many attempts. Try again${wait}.`, {}, res.retryAfter);
  }
  if (status >= 500) return new ApiError(status, "TrastImport is having trouble right now. Try again in a moment.");
  if (Array.isArray(data)) return new ApiError(status, firstString(data) ?? "Something went wrong.");
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return new ApiError(status, data.detail, {}, undefined, data.code);
    const fieldErrors = {};
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

async function request(method, path, opts = {}) {
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
  return res.data;
}

// ---------------------------------------------------------------------------
// Wire format
//
// The server names a few fields differently from what the screens use (e.g. `address` is
// `street_address`). These convert server responses, and back for the few that are sent.

const ADDRESS_TYPE_FROM_WIRE = { HQ: "HEADQUARTERS", BR: "BRANCH", WH: "WAREHOUSE", OFF: "OFFICE" };
const ADDRESS_TYPE_TO_WIRE = { HEADQUARTERS: "HQ", BRANCH: "BR", WAREHOUSE: "WH", OFFICE: "OFF" };

function fromWireAddress(a) {
  return {
    ...a,
    street_address: a.street_address ?? a.address ?? "",
    address_type: ADDRESS_TYPE_FROM_WIRE[a.address_type] ?? a.address_type,
  };
}

function toWireAddress(a) {
  const { street_address, address_type, ...rest } = a;
  return {
    ...rest,
    ...(street_address !== undefined && { address: street_address }),
    ...(address_type !== undefined && { address_type: ADDRESS_TYPE_TO_WIRE[address_type] }),
  };
}

function fromWireCompany(c) {
  return { ...c, addresses: (c.addresses ?? []).map(fromWireAddress) };
}

function fromWireReview(r) {
  const author = r.customer;
  return {
    ...r,
    customer_id: author?.id ?? r.customer_id ?? r.user,
    author_name: author?.name ?? r.author_name ?? "",
    author_country: author?.country ?? r.author_country ?? "",
    author_is_verified: author?.is_verified ?? r.author_is_verified ?? false,
    date_created: r.date_created ?? r.date,
  };
}

/** Claims and verification requests: the server calls the creation date `created_at`. */
function fromWireRequest(x) {
  return { ...x, date_created: x.date_created ?? x.created_at };
}

const mapPage = (page, fn) => ({ ...page, results: page.results.map(fn) });

// ---------------------------------------------------------------------------
// Endpoints

export const PAGE_SIZE = 10;

export const api = {
  auth: {
    login: (email, password) =>
      request("POST", "/auth/jwt/create/", { json: { email, password }, auth: false }),
    signUp: (data) =>
      request("POST", "/auth/users/", { json: data, auth: false }),
    resendActivation: (email) =>
      request("POST", "/auth/users/resend_activation/", { json: { email }, auth: false }),
    /** Activates a new account with the 6-digit code from the sign-up email; returns tokens. */
    activateWithCode: (email, code) =>
      request("POST", "/auth/users/activate_code/", { json: { email, code }, auth: false }),
    /** Second login step: the code emailed after a correct password; returns tokens. */
    verifyLoginCode: (ticket, code) =>
      request("POST", "/auth/otp/verify/", { json: { ticket, code }, auth: false }),
    resendLoginCode: (ticket) =>
      request("POST", "/auth/otp/resend/", { json: { ticket }, auth: false }),
    /** Exchanges a Google ID token for this API's access/refresh tokens. */
    google: (id_token) =>
      request("POST", "/auth/google/", { json: { id_token }, auth: false }),
    /** Same as google(), for Sign in with Apple. Apple only sends the name on the first sign-in. */
    apple: (id_token, first_name, last_name) =>
      request("POST", "/auth/apple/", { json: { id_token, first_name, last_name }, auth: false }),
    me: () => request("GET", "/auth/users/me/"),
    resetPassword: (email) =>
      request("POST", "/auth/users/reset_password/", { json: { email }, auth: false }),
    resetPasswordConfirm: (uid, token, new_password) =>
      request("POST", "/auth/users/reset_password_confirm/", { json: { uid, token, new_password }, auth: false }),
    setPassword: (current_password, new_password) =>
      request("POST", "/auth/users/set_password/", { json: { current_password, new_password } }),
    setEmail: (current_password, new_email) =>
      request("POST", "/auth/users/set_email/", { json: { current_password, new_email } }),
    deleteAccount: (current_password) =>
      request("DELETE", "/auth/users/me/", { json: { current_password } }),
    socialUrl: (provider, redirect_uri) =>
      request("GET", `/auth/o/${provider}/`, { query: { redirect_uri }, auth: false }),
    socialComplete: (provider, code, state) =>
      request("POST", `/auth/o/${provider}/`, { form: { code, state }, auth: false }),
  },

  customer: {
    me: () => request("GET", "/apps/customers/me/"),
    update: (data) =>
      request("PATCH", "/apps/customers/me/", { json: data }),
  },

  companies: {
    list: async (filters, offset = 0) =>
      mapPage(await request("GET", "/apps/companies/", { query: { ...filters, limit: PAGE_SIZE, offset } }), fromWireCompany),
    get: async (id) => fromWireCompany(await request("GET", `/apps/companies/${id}/`)),
    /** Countries that have companies: [{ code: "CN", name: "China", count: 12 }], most companies first. */
    countries: (company_type) => request("GET", "/apps/companies/countries/", { query: { company_type } }),
    // The schema documents a single company here; accept a list, a page or one object.
    mine: async () => {
      const data = await request("GET", "/apps/companies/mine/");
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : data ? [data] : [];
      return list.map(fromWireCompany);
    },
    update: async (id, data) =>
      fromWireCompany(await request("PATCH", `/apps/companies/${id}/`, { json: data })),
    addAddress: async (id, data) =>
      fromWireAddress(await request("POST", `/apps/companies/${id}/addresses/`, { json: toWireAddress(data) })),
    claim: async (id, message, document) =>
      fromWireRequest(await request("POST", `/apps/companies/${id}/claim/`, { form: { message, document } })),
    reviews: async (id, offset = 0) =>
      mapPage(await request("GET", `/apps/companies/${id}/reviews/`, { query: { limit: 20, offset } }), fromWireReview),
    createReview: async (id, rating, comment) =>
      fromWireReview(await request("POST", `/apps/companies/${id}/reviews/`, { json: { rating, comment } })),
  },

  addresses: {
    update: async (id, data) =>
      fromWireAddress(await request("PATCH", `/apps/addresses/${id}/`, { json: toWireAddress(data) })),
    remove: (id) => request("DELETE", `/apps/addresses/${id}/`),
  },

  reviews: {
    // The API has no "my reviews" endpoint yet, so this pages through everyone's and keeps
    // the signed-in customer's. Swap to GET /apps/reviews/mine/ once it exists.
    mine: async () => {
      const me = await request("GET", "/apps/customers/me/");
      const mine = [];
      for (let offset = 0; ; offset += 100) {
        const page = await request("GET", "/apps/reviews/", { query: { limit: 100, offset } });
        mine.push(...page.results.map(fromWireReview).filter((r) => r.customer_id === me.id));
        if (!page.next) break;
      }
      // Reviews carry only a company id; look up names for the list.
      const missing = [...new Set(mine.filter((r) => !r.company_name).map((r) => r.company))];
      const names = new Map();
      await Promise.all(
        missing.map((id) => request("GET", `/apps/companies/${id}/`).then((c) => names.set(id, c.name), () => {})),
      );
      return mine.map((r) => ({ ...r, company_name: r.company_name ?? names.get(r.company) }));
    },
    get: async (id) => fromWireReview(await request("GET", `/apps/reviews/${id}/`)),
    update: async (id, data) =>
      fromWireReview(await request("PATCH", `/apps/reviews/${id}/`, { json: data })),
    remove: (id) => request("DELETE", `/apps/reviews/${id}/`),
    addPhoto: (id, image) =>
      request("POST", `/apps/reviews/${id}/photos/`, { form: { image } }),
    removePhoto: (id, photoId) => request("DELETE", `/apps/reviews/${id}/photos/${photoId}/`),
    // Returns only the reply fields, not the whole review.
    reply: (id, reply) =>
      request("POST", `/apps/reviews/${id}/reply/`, { json: { reply } }),
  },

  claims: {
    list: async () => mapPage(await request("GET", "/apps/claims/", { query: { limit: 100 } }), fromWireRequest),
  },

  chat: {
    /** Your conversations, as a buyer and as a company owner; most recent first. */
    conversations: (offset = 0) => request("GET", "/chat/conversations/", { query: { limit: 50, offset } }),
    conversation: (id) => request("GET", `/chat/conversations/${id}/`),
    /** Opens the conversation with a company, or returns the existing one. */
    open: (companyId) => request("POST", "/chat/conversations/", { json: { company_id: companyId } }),
    /** Oldest first. `before`/`after` are message ids for older or newer pages. */
    messages: (id, { before, after, limit = 50 } = {}) =>
      request("GET", `/chat/conversations/${id}/messages/`, { query: { before, after, limit } }),
    send: (id, body) => request("POST", `/chat/conversations/${id}/messages/`, { json: { body } }),
    /** A message with a file ({ uri, name, type }); the reply's `attachment` has url, name, size, content_type. */
    sendFile: (id, body, file) => request("POST", `/chat/conversations/${id}/messages/`, { form: { body: body ?? "", attachment: file } }),
    read: (id) => request("POST", `/chat/conversations/${id}/read/`),
  },

  verifications: {
    list: async () =>
      mapPage(await request("GET", "/apps/verifications/", { query: { limit: 100 } }), fromWireRequest),
    create: async (document, note) =>
      fromWireRequest(await request("POST", "/apps/verifications/", { form: { document, note } })),
  },
};

export function errorMessage(error) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
