import { colors } from "./theme";

// Shipping methods as the API names them (MethodEnum).
export const METHODS = {
  SEA: { label: "Sea freight", short: "Sea", icon: { sf: "ferry.fill", md: "directions_boat" }, fg: colors.sea, bg: colors.seaSoft },
  AIR: { label: "Air standard", short: "Air", icon: { sf: "airplane", md: "flight" }, fg: colors.air, bg: colors.airSoft },
  EXPRESS: { label: "Air express", short: "Express", icon: { sf: "airplane", md: "flight" }, fg: colors.air, bg: colors.airSoft },
};
export const METHOD_ORDER = ["SEA", "AIR", "EXPRESS"];

export const UNIT_LABEL = { KG: "per kg", CBM: "per CBM" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-12" → local midnight. (new Date("2026-11-12") would be UTC and can land on the 11th.) */
export function parseDay(value) {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

/** Local date as "YYYY-MM-DD", the format the API takes for departure_date. */
export function isoDay(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from today: 0 today, 1 tomorrow, -1 yesterday. */
export function daysFromToday(value) {
  return Math.round((startOfDay(parseDay(value)) - startOfDay(new Date())) / 86_400_000);
}

export function clock(date) {
  const d = parseDay(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Thu 12 Nov". */
export function shortDate(value) {
  const d = parseDay(value);
  return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function monthShort(value) {
  return MONTHS[parseDay(value).getMonth()].toUpperCase();
}

/** "Today", "Tomorrow", a weekday within the week ("Saturday"), else "Wed 18 Nov". */
export function relativeDay(value) {
  const n = daysFromToday(value);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n > 1 && n < 7) return DAYS[parseDay(value).getDay()];
  return shortDate(value);
}

/** Drop-off cut-off: "today 18:00", "tomorrow 17:00" or "Fri 13 Nov, 17:00". */
export function deadlineText(iso) {
  const n = daysFromToday(iso);
  if (n === 0) return `today ${clock(iso)}`;
  if (n === 1) return `tomorrow ${clock(iso)}`;
  return `${shortDate(iso)}, ${clock(iso)}`;
}

/** "Air express to Brazil". */
export function departureTitle(d) {
  return `${METHODS[d.method]?.label ?? d.method} to ${d.destination}`;
}

/** "Ships tomorrow" style badge for departures leaving in the next two days, else null. */
export function soonLabel(value) {
  const n = daysFromToday(value);
  if (n === 0) return "Ships today";
  if (n === 1) return "Ships tomorrow";
  return null;
}

export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "3–5 days". */
export function transitText(p) {
  if (!p.transit_days_min && !p.transit_days_max) return "";
  if (p.transit_days_min === p.transit_days_max || !p.transit_days_max) return `${p.transit_days_min} days`;
  return `${p.transit_days_min}–${p.transit_days_max} days`;
}

/** "Air and sea" from a set of methods. */
export function shipsBy(methods) {
  const air = methods.some((m) => m === "AIR" || m === "EXPRESS");
  const sea = methods.includes("SEA");
  if (air && sea) return "Air and sea";
  if (air) return "Air";
  if (sea) return "Sea";
  return "";
}

/** The city a company works from: its first address. */
export function homeCity(company) {
  return company.addresses?.[0]?.city ?? "";
}

/** "Freight forwarder in Guangzhou", "Verified supplier in Shenzhen". */
export function companyLine(company) {
  const kind = company.company_type === "LOG" ? "Shipping company" : company.is_verified ? "Verified supplier" : "Supplier";
  const city = homeCity(company);
  return city ? `${kind} in ${city}` : kind;
}

/** Destination names a company ships to, from the API's ships_to (names) or its route text. */
export function shipsTo(company) {
  return Array.isArray(company.ships_to) ? company.ships_to.filter(Boolean) : [];
}
