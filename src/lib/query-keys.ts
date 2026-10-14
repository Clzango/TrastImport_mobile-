import type { QueryClient } from "@tanstack/react-query";
import type { CompanyFilters } from "./api";

export const keys = {
  companies: (filters?: CompanyFilters) => (filters ? ["companies", filters] : ["companies"]),
  company: (id: number) => ["company", id],
  companyReviews: (id: number) => ["company-reviews", id],
  review: (id: number) => ["review", id],
  myReviews: ["my-reviews"],
  myCompanies: ["my-companies"],
  customer: ["customer"],
  claims: ["claims"],
  verifications: ["verifications"],
};

/** Everything that shows a company's rating or reviews. Call after any review change. */
export function invalidateCompany(queryClient: QueryClient, companyId: number) {
  queryClient.invalidateQueries({ queryKey: keys.company(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companyReviews(companyId) });
  queryClient.invalidateQueries({ queryKey: keys.companies() });
  queryClient.invalidateQueries({ queryKey: keys.myReviews });
  queryClient.invalidateQueries({ queryKey: keys.myCompanies });
}
