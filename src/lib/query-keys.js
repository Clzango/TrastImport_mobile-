export const keys = {
  companies: (filters) => (filters ? ["companies", filters] : ["companies"]),
  company: (id) => ["company", id],
  countries: (companyType) => ["countries", companyType ?? "ALL"],
  conversations: ["conversations"],
  conversation: (id) => ["conversation", id],
  messages: (id) => ["messages", id],
  companyReviews: (id) => ["company-reviews", id],
  review: (id) => ["review", id],
  myReviews: ["my-reviews"],
  myCompanies: ["my-companies"],
  customer: ["customer"],
  claims: ["claims"],
  verifications: ["verifications"],
  departures: (filters) => (filters ? ["departures", filters] : ["departures"]),
  prices: (filters) => (filters ? ["prices", filters] : ["prices"]),
};

/** Everything that shows a shipping company's departures or prices. Call after the owner edits them. */
export function invalidateShipping(queryClient, companyId) {
  queryClient.invalidateQueries({ queryKey: keys.departures() });
  queryClient.invalidateQueries({ queryKey: keys.prices() });
  queryClient.invalidateQueries({ queryKey: keys.company(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companies() });
}

/** Everything that shows a company's rating or reviews. Call after any review change. */
export function invalidateCompany(queryClient, companyId) {
  queryClient.invalidateQueries({ queryKey: keys.company(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companyReviews(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companies() });
  queryClient.invalidateQueries({ queryKey: keys.myReviews });
  queryClient.invalidateQueries({ queryKey: keys.myCompanies });
}
