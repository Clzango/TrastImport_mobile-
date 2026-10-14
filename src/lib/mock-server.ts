// In-memory stand-in for the TrastImport API, used when EXPO_PUBLIC_API_URL is not set.
// It follows the endpoints, status codes and error bodies in the mobile spec closely
// enough to build and demo every screen. Data resets when the app reloads.
//
// Demo account: demo@trastimport.com / password123 (owns "Shenzhen Brightline Electronics").

import type { TransportRequest, TransportResponse } from "./api";
import type { Address, Claim, Company, Customer, LocalFile, Review, Verification } from "./types";

interface MockUser {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

let nextId = 1000;
const id = () => ++nextId;

const users: MockUser[] = [
  { id: 1, email: "demo@trastimport.com", password: "password123", first_name: "Ana", last_name: "Silva", is_staff: false },
  { id: 2, email: "marco@example.com", password: "x", first_name: "Marco", last_name: "Rossi", is_staff: false },
  { id: 3, email: "lena@example.com", password: "x", first_name: "Lena", last_name: "Müller", is_staff: false },
  { id: 4, email: "james@example.com", password: "x", first_name: "James", last_name: "Okafor", is_staff: false },
];

const customers: Record<number, Customer> = {
  1: { id: 1, first_name: "Ana", last_name: "Silva", country: "Brazil", city: "São Paulo", phone: "+55 11 91234 5678", address: "", is_verified: false },
  2: { id: 2, first_name: "Marco", last_name: "Rossi", country: "Italy", city: "Milan", phone: "", address: "", is_verified: true },
  3: { id: 3, first_name: "Lena", last_name: "Müller", country: "Germany", city: "Hamburg", phone: "", address: "", is_verified: true },
  4: { id: 4, first_name: "James", last_name: "Okafor", country: "Nigeria", city: "Lagos", phone: "", address: "", is_verified: false },
};

const owners: Record<number, number> = { 1: 1 }; // companyId -> userId

const addr = (country: string, city: string, street_address: string, address_type: Address["address_type"]): Address => ({
  id: id(),
  country,
  city,
  street_address,
  address_type,
});

const companies: Company[] = [
  {
    id: 1, name: "Shenzhen Brightline Electronics", company_type: "SUP",
    description: "OEM and ODM manufacturer of LED lighting, power supplies and smart home devices since 2009. In-house tooling, CE and RoHS certified lines.",
    phone: "+86 755 1234 5678", wechat_id: "brightline_sales", website: "https://brightline.example.cn",
    moq: 500, main_products: "LED strips, LED panels, smart plugs, USB-C chargers", routes_serviced: "",
    average_rating: null, review_count: 0, is_verified: true, has_owner: true,
    addresses: [addr("China", "Shenzhen", "No. 18 Keji Road, Nanshan District", "HEADQUARTERS"), addr("China", "Dongguan", "Building 3, Chang'an Industrial Park", "WAREHOUSE")],
    date_created: daysAgo(400),
  },
  {
    id: 2, name: "Yiwu Grand Trading Co.", company_type: "SUP",
    description: "Sourcing agent and wholesaler for small commodities: homeware, toys, stationery and seasonal goods. Mixed-container consolidation available.",
    phone: "+86 579 8555 0101", wechat_id: "yiwugrand", website: "",
    moq: 100, main_products: "Homeware, toys, stationery, festival decorations", routes_serviced: "",
    average_rating: null, review_count: 0, is_verified: false, has_owner: false,
    addresses: [addr("China", "Yiwu", "Futian Market District 2, Gate 7", "OFFICE")],
    date_created: daysAgo(300),
  },
  {
    id: 3, name: "Ningbo Ocean Link Logistics", company_type: "LOG",
    description: "NVOCC and freight forwarder. FCL and LCL sea freight from Ningbo and Shanghai, customs brokerage and door-to-door delivery.",
    phone: "+86 574 8777 2233", wechat_id: "oceanlink_nb", website: "https://oceanlink.example.com",
    moq: null, main_products: "", routes_serviced: "Ningbo → Santos, Ningbo → Rotterdam, Shanghai → Lagos, Shanghai → Los Angeles",
    average_rating: null, review_count: 0, is_verified: true, has_owner: false,
    addresses: [addr("China", "Ningbo", "88 Zhongshan East Road, Haishu District", "HEADQUARTERS"), addr("China", "Shanghai", "Yangshan Port Logistics Zone", "WAREHOUSE")],
    date_created: daysAgo(500),
  },
  {
    id: 4, name: "Guangzhou SwiftAir Cargo", company_type: "LOG",
    description: "Air freight and express consolidation out of Baiyun airport. Battery and cosmetics handling with dangerous-goods paperwork.",
    phone: "+86 20 3666 4455", wechat_id: "swiftair_gz", website: "",
    moq: null, main_products: "", routes_serviced: "Guangzhou → Lagos, Guangzhou → São Paulo, Guangzhou → Dubai",
    average_rating: null, review_count: 0, is_verified: false, has_owner: false,
    addresses: [addr("China", "Guangzhou", "Baiyun Airport Cargo Terminal, Hall B", "WAREHOUSE")],
    date_created: daysAgo(120),
  },
  {
    id: 5, name: "Foshan Comfort Furniture Factory", company_type: "SUP",
    description: "Upholstered sofas, dining sets and hotel furniture. Factory visits by appointment.",
    phone: "+86 757 2888 9900", wechat_id: "", website: "https://comfortfurniture.example.cn",
    moq: 20, main_products: "Sofas, dining tables, hotel furniture", routes_serviced: "",
    average_rating: null, review_count: 0, is_verified: true, has_owner: false,
    addresses: [addr("China", "Foshan", "Lecong Furniture City, Block 12", "HEADQUARTERS")],
    date_created: daysAgo(60),
  },
  {
    id: 6, name: "Xiamen Pacific Textiles", company_type: "SUP",
    description: "Knit and woven fabrics, custom printing and garment production for small brands.",
    phone: "+86 592 5123 7788", wechat_id: "pacific_tex", website: "",
    moq: 300, main_products: "Cotton jersey, polyester fabrics, T-shirts, hoodies", routes_serviced: "",
    average_rating: null, review_count: 0, is_verified: false, has_owner: false,
    addresses: [],
    date_created: daysAgo(30),
  },
];

const reviews: Review[] = [];
const claims: (Claim & { user: number })[] = [];
const verifications: (Verification & { user: number })[] = [];

function seedReview(companyId: number, userId: number, rating: number, comment: string, days: number, reply = "") {
  const c = customers[userId];
  reviews.push({
    id: id(), company: companyId, company_name: companies.find((x) => x.id === companyId)!.name, user: userId,
    author_name: `${c.first_name} ${c.last_name[0]}.`, author_country: c.country, author_is_verified: c.is_verified,
    rating, comment, photos: [], reply, reply_date: reply ? daysAgo(days - 1) : null, date_created: daysAgo(days),
  });
}

seedReview(1, 2, 5, "Third order with Brightline. Samples matched production, QC photos before shipping and they fixed a packaging issue without arguing.", 40, "Thank you Marco, see you at the Canton Fair!");
seedReview(1, 3, 4, "Good quality LED panels. Lead time slipped by a week during Chinese New Year but they warned us early.", 25);
seedReview(1, 4, 4, "Responsive on WeChat, fair prices for 1,000 pcs. Would order again.", 10);
seedReview(2, 2, 3, "Fine for mixed small goods, but check every carton. Two SKUs were swapped.", 70);
seedReview(3, 3, 5, "Smooth LCL to Rotterdam, all documents on time. Customs broker in Hamburg had zero questions.", 15);
seedReview(3, 4, 2, "Container to Lagos arrived 3 weeks late and the extra storage fees were not explained up front.", 50);
seedReview(4, 2, 4, "Fast air freight to São Paulo, handled batteries properly.", 20);
seedReview(5, 3, 5, "Visited the factory. Solid wood frames, honest about lead times.", 35);

function recalc(companyId: number) {
  const company = companies.find((c) => c.id === companyId);
  if (!company) return;
  const rs = reviews.filter((r) => r.company === companyId);
  company.review_count = rs.length;
  company.average_rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : null;
}
companies.forEach((c) => recalc(c.id));

// ---------------------------------------------------------------------------

const ok = (data: unknown = null, status = 200): TransportResponse => ({ status, data });
const fail = (status: number, data: unknown): TransportResponse => ({ status, data });
const detail = (status: number, message: string) => fail(status, { detail: message });

function userFromToken(token?: string) {
  const m = token?.match(/^mock-access-(\d+)$/);
  return m ? users.find((u) => u.id === Number(m[1])) : undefined;
}

function paginate<T>(items: T[], query: Record<string, unknown> = {}, defaultLimit = 20) {
  const limit = Math.min(Number(query.limit) || defaultLimit, 100);
  const offset = Number(query.offset) || 0;
  const results = items.slice(offset, offset + limit);
  return {
    count: items.length,
    next: offset + limit < items.length ? `?limit=${limit}&offset=${offset + limit}` : null,
    previous: offset > 0 ? `?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
    results,
  };
}

function fileUri(value: unknown) {
  return value && typeof value === "object" ? (value as LocalFile).uri : undefined;
}

const tokensFor = (u: MockUser) => ({ access: `mock-access-${u.id}`, refresh: `mock-refresh-${u.id}` });

type Ctx = { query: Record<string, any>; body: Record<string, any>; user?: MockUser };
type Handler = (ctx: Ctx, ...params: string[]) => TransportResponse;

const routes: [TransportRequest["method"], RegExp, Handler, { auth?: boolean }?][] = [
  // --- Auth
  ["POST", /^\/auth\/jwt\/create\/$/, ({ body }) => {
    const u = users.find((x) => x.email.toLowerCase() === String(body.email ?? "").toLowerCase() && x.password === body.password);
    return u ? ok(tokensFor(u)) : detail(401, "No active account found with the given credentials");
  }],
  ["POST", /^\/auth\/jwt\/refresh\/$/, ({ body }) => {
    const m = String(body.refresh ?? "").match(/^mock-refresh-(\d+)$/);
    return m ? ok({ access: `mock-access-${m[1]}` }) : detail(401, "Token is invalid or expired");
  }],
  ["POST", /^\/auth\/users\/$/, ({ body }) => {
    const errors: Record<string, string[]> = {};
    if (!body.email) errors.email = ["This field is required."];
    else if (users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) errors.email = ["user with this email already exists."];
    if (!body.password || String(body.password).length < 8) errors.password = ["This password is too short. It must contain at least 8 characters."];
    if (Object.keys(errors).length) return fail(400, errors);
    const u: MockUser = { id: id(), email: body.email, password: body.password, first_name: body.first_name ?? "", last_name: body.last_name ?? "", is_staff: false };
    users.push(u);
    customers[u.id] = { id: u.id, first_name: u.first_name, last_name: u.last_name, country: "", city: "", phone: "", address: "", is_verified: false };
    return ok({ id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name }, 201);
  }],
  ["GET", /^\/auth\/users\/me\/$/, ({ user }) => {
    const { password: _, ...rest } = user!;
    return ok(rest);
  }, { auth: true }],
  ["DELETE", /^\/auth\/users\/me\/$/, ({ user, body }) => {
    if (body.current_password !== user!.password) return fail(400, { current_password: ["Invalid password."] });
    users.splice(users.indexOf(user!), 1);
    return ok(null, 204);
  }, { auth: true }],
  ["POST", /^\/auth\/users\/reset_password\/$/, () => ok(null, 204)],
  ["POST", /^\/auth\/users\/reset_password_confirm\/$/, ({ body }) =>
    String(body.new_password ?? "").length < 8
      ? fail(400, { new_password: ["This password is too short. It must contain at least 8 characters."] })
      : ok(null, 204)],
  ["POST", /^\/auth\/users\/set_password\/$/, ({ user, body }) => {
    if (body.current_password !== user!.password) return fail(400, { current_password: ["Invalid password."] });
    if (String(body.new_password ?? "").length < 8) return fail(400, { new_password: ["This password is too short. It must contain at least 8 characters."] });
    user!.password = body.new_password;
    return ok(null, 204);
  }, { auth: true }],
  ["POST", /^\/auth\/users\/set_email\/$/, ({ user, body }) => {
    if (body.current_password !== user!.password) return fail(400, { current_password: ["Invalid password."] });
    user!.email = body.new_email;
    return ok(null, 204);
  }, { auth: true }],
  ["GET", /^\/auth\/o\/([\w-]+)\/$/, () => detail(400, "Social login needs the real API server. Set EXPO_PUBLIC_API_URL.")],

  // --- Customer
  ["GET", /^\/apps\/customers\/me\/$/, ({ user }) => ok(customers[user!.id]), { auth: true }],
  ["PATCH", /^\/apps\/customers\/me\/$/, ({ user, body }) => {
    const { is_verified: _, id: __, ...rest } = body;
    Object.assign(customers[user!.id], rest);
    return ok(customers[user!.id]);
  }, { auth: true }],

  // --- Companies
  ["GET", /^\/apps\/companies\/$/, ({ query }) => {
    let list = [...companies];
    const s = String(query.search ?? "").toLowerCase();
    if (s) list = list.filter((c) => [c.name, c.main_products, c.routes_serviced].some((f) => f.toLowerCase().includes(s)));
    if (query.company_type) list = list.filter((c) => c.company_type === query.company_type);
    if (query.is_verified === "true") list = list.filter((c) => c.is_verified);
    if (query.min_rating) list = list.filter((c) => c.average_rating !== null && Number(c.average_rating) >= Number(query.min_rating));
    const ordering = String(query.ordering ?? "name");
    const desc = ordering.startsWith("-");
    const key = ordering.replace("-", "") as keyof Company;
    list.sort((a, b) => {
      const av = a[key] as any, bv = b[key] as any;
      if (key === "average_rating") {
        if (av === null && bv !== null) return 1;
        if (bv === null && av !== null) return -1;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv) : (av ?? 0) - (bv ?? 0);
      return desc ? -cmp : cmp;
    });
    return ok(paginate(list, query, 10));
  }],
  ["GET", /^\/apps\/companies\/mine\/$/, ({ user }) => ok(companies.filter((c) => owners[c.id] === user!.id)), { auth: true }],
  ["GET", /^\/apps\/companies\/(\d+)\/$/, (_, cid) => {
    const c = companies.find((x) => x.id === Number(cid));
    return c ? ok(c) : detail(404, "No Company matches the given query.");
  }],
  ["PATCH", /^\/apps\/companies\/(\d+)\/$/, ({ user, body }, cid) => {
    const c = companies.find((x) => x.id === Number(cid));
    if (!c) return detail(404, "Not found.");
    if (owners[c.id] !== user!.id) return detail(403, "You do not have permission to perform this action.");
    const { name, description, phone, wechat_id, website, moq, main_products, routes_serviced } = body;
    Object.assign(c, Object.fromEntries(Object.entries({ name, description, phone, wechat_id, website, moq, main_products, routes_serviced }).filter(([, v]) => v !== undefined)));
    return ok(c);
  }, { auth: true }],
  ["POST", /^\/apps\/companies\/(\d+)\/addresses\/$/, ({ user, body }, cid) => {
    const c = companies.find((x) => x.id === Number(cid));
    if (!c) return detail(404, "Not found.");
    if (owners[c.id] !== user!.id) return detail(403, "You do not have permission to perform this action.");
    if (!body.city) return fail(400, { city: ["This field is required."] });
    const a = addr(body.country ?? "", body.city, body.street_address ?? "", body.address_type ?? "OFFICE");
    c.addresses.push(a);
    return ok(a, 201);
  }, { auth: true }],
  ["POST", /^\/apps\/companies\/(\d+)\/claim\/$/, ({ user, body }, cid) => {
    const c = companies.find((x) => x.id === Number(cid));
    if (!c) return detail(404, "Not found.");
    if (owners[c.id] === user!.id) return fail(400, ["You already own this company."]);
    if (c.has_owner) return fail(400, ["This company already has an owner."]);
    if (claims.some((x) => x.company === c.id && x.user === user!.id && x.status === "PENDING")) return fail(400, ["You already have a pending claim for this company."]);
    if (!String(body.message ?? "").trim()) return fail(400, { message: ["This field is required."] });
    const claim = { id: id(), user: user!.id, company: c.id, company_name: c.name, message: body.message, status: "PENDING" as const, admin_note: "", reviewed_at: null, date_created: now(), document_url: fileUri(body.document) ?? null };
    claims.unshift(claim);
    return ok(claim, 201);
  }, { auth: true }],

  // --- Reviews
  ["GET", /^\/apps\/companies\/(\d+)\/reviews\/$/, ({ query }, cid) =>
    ok(paginate(reviews.filter((r) => r.company === Number(cid)).sort((a, b) => b.date_created.localeCompare(a.date_created)), query))],
  ["POST", /^\/apps\/companies\/(\d+)\/reviews\/$/, ({ user, body }, cid) => {
    const c = companies.find((x) => x.id === Number(cid));
    if (!c) return detail(404, "Not found.");
    if (owners[c.id] === user!.id) return fail(400, ["You can't review your own company."]);
    if (reviews.some((r) => r.company === c.id && r.user === user!.id)) return fail(400, { non_field_errors: ["You have already reviewed this company. Edit your existing review instead."] });
    const rating = Number(body.rating);
    if (!(rating >= 1 && rating <= 5)) return fail(400, { rating: ["Ensure this value is between 1 and 5."] });
    const cust = customers[user!.id];
    const r: Review = {
      id: id(), company: c.id, company_name: c.name, user: user!.id,
      author_name: `${cust.first_name} ${cust.last_name ? cust.last_name[0] + "." : ""}`.trim(), author_country: cust.country, author_is_verified: cust.is_verified,
      rating, comment: body.comment ?? "", photos: [], reply: "", reply_date: null, date_created: now(),
    };
    reviews.push(r);
    recalc(c.id);
    return ok(r, 201);
  }, { auth: true }],
  ["GET", /^\/apps\/reviews\/$/, ({ query }) => ok(paginate([...reviews].sort((a, b) => b.date_created.localeCompare(a.date_created)), query))],
  ["GET", /^\/apps\/reviews\/(\d+)\/$/, (_, rid) => {
    const r = reviews.find((x) => x.id === Number(rid));
    return r ? ok(r) : detail(404, "Not found.");
  }],
  ["PATCH", /^\/apps\/reviews\/(\d+)\/$/, ({ user, body }, rid) => {
    const r = reviews.find((x) => x.id === Number(rid));
    if (!r) return detail(404, "Not found.");
    if (r.user !== user!.id) return detail(403, "You do not have permission to perform this action.");
    if (body.rating !== undefined) r.rating = Number(body.rating);
    if (body.comment !== undefined) r.comment = body.comment;
    recalc(r.company);
    return ok(r);
  }, { auth: true }],
  ["DELETE", /^\/apps\/reviews\/(\d+)\/$/, ({ user }, rid) => {
    const i = reviews.findIndex((x) => x.id === Number(rid));
    if (i < 0) return detail(404, "Not found.");
    if (reviews[i].user !== user!.id) return detail(403, "You do not have permission to perform this action.");
    const [r] = reviews.splice(i, 1);
    recalc(r.company);
    return ok(null, 204);
  }, { auth: true }],
  ["POST", /^\/apps\/reviews\/(\d+)\/photos\/$/, ({ user, body }, rid) => {
    const r = reviews.find((x) => x.id === Number(rid));
    if (!r) return detail(404, "Not found.");
    if (r.user !== user!.id) return detail(403, "You do not have permission to perform this action.");
    if (r.photos.length >= 5) return fail(400, ["A review can have at most 5 photos."]);
    const uri = fileUri(body.image);
    if (!uri) return fail(400, { image: ["No file was submitted."] });
    const photo = { id: id(), image: uri };
    r.photos.push(photo);
    return ok(photo, 201);
  }, { auth: true }],
  ["DELETE", /^\/apps\/reviews\/(\d+)\/photos\/(\d+)\/$/, ({ user }, rid, pid) => {
    const r = reviews.find((x) => x.id === Number(rid));
    if (!r) return detail(404, "Not found.");
    if (r.user !== user!.id) return detail(403, "You do not have permission to perform this action.");
    r.photos = r.photos.filter((p) => p.id !== Number(pid));
    return ok(null, 204);
  }, { auth: true }],
  ["POST", /^\/apps\/reviews\/(\d+)\/reply\/$/, ({ user, body }, rid) => {
    const r = reviews.find((x) => x.id === Number(rid));
    if (!r) return detail(404, "Not found.");
    if (owners[r.company] !== user!.id) return detail(403, "Only the company owner can reply.");
    r.reply = body.reply ?? "";
    r.reply_date = r.reply ? now() : null;
    return ok(r);
  }, { auth: true }],

  // --- Claims & verification
  ["GET", /^\/apps\/claims\/$/, ({ user, query }) =>
    ok(paginate(claims.filter((c) => c.user === user!.id && (!query.status || c.status === query.status)), query)), { auth: true }],
  ["GET", /^\/apps\/verifications\/$/, ({ user, query }) => ok(paginate(verifications.filter((v) => v.user === user!.id), query)), { auth: true }],
  ["POST", /^\/apps\/verifications\/$/, ({ user, body }) => {
    if (customers[user!.id].is_verified) return fail(400, ["You are already verified."]);
    if (verifications.some((v) => v.user === user!.id && v.status === "PENDING")) return fail(400, ["You already have a verification request under review."]);
    const uri = fileUri(body.document);
    if (!uri) return fail(400, { document: ["No file was submitted."] });
    const v = { id: id(), user: user!.id, note: body.note ?? "", status: "PENDING" as const, admin_note: "", reviewed_at: null, date_created: now(), document_url: uri };
    verifications.unshift(v);
    return ok(v, 201);
  }, { auth: true }],
];

export async function mockSend(req: TransportRequest): Promise<TransportResponse> {
  await new Promise((r) => setTimeout(r, 250));
  const user = userFromToken(req.token);
  for (const [method, pattern, handler, opts] of routes) {
    if (method !== req.method) continue;
    const match = req.path.match(pattern);
    if (!match) continue;
    if (opts?.auth && !user) return detail(401, "Authentication credentials were not provided.");
    const body = (req.form ?? (req.json as Record<string, any>) ?? {}) as Record<string, any>;
    const query = Object.fromEntries(Object.entries(req.query ?? {}).map(([k, v]) => [k, v === undefined || v === null ? undefined : String(v)]));
    // Return copies so screens can't mutate the "server" state by accident.
    const res = handler({ query, body, user }, ...match.slice(1));
    return { ...res, data: res.data === null ? null : JSON.parse(JSON.stringify(res.data)) };
  }
  return detail(404, "Not found.");
}
