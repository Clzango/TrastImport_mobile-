import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";
import { keys } from "./query-keys";

/**
 * Ids of the companies the signed-in account owns. /auth/users/me/ sends owned_company_ids;
 * until a server does, this falls back to /apps/companies/mine/.
 */
export function useOwnedCompanyIds() {
  const { user, status } = useAuth();
  const fromUser = Array.isArray(user?.owned_company_ids) ? user.owned_company_ids : null;
  const mine = useQuery({ queryKey: keys.myCompanies, queryFn: api.companies.mine, enabled: status === "signedIn" && !fromUser });
  return fromUser ?? mine.data?.map((c) => c.id) ?? [];
}

export function useOwnsCompany(id) {
  return useOwnedCompanyIds().includes(id);
}
