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
};

/** Everything that shows a company's rating or reviews. Call after any review change. */
export function invalidateCompany(queryClient, companyId) {
  queryClient.invalidateQueries({ queryKey: keys.company(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companyReviews(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companies() });
  queryClient.invalidateQueries({ queryKey: keys.myReviews });
  queryClient.invalidateQueries({ queryKey: keys.myCompanies });
}
