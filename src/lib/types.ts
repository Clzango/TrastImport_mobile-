// The shapes the screens work with. The REST API names some fields differently
// (see /api/schema/); api.ts converts them on the way in and out.

export type CompanyType = "SUP" | "LOG";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  country: string;
  city: string;
  phone: string;
  address: string;
  is_verified: boolean;
}

export type AddressType = "HEADQUARTERS" | "BRANCH" | "WAREHOUSE" | "OFFICE";

export interface Address {
  id: number;
  country: string;
  city: string;
  street_address: string;
  address_type: AddressType;
}

export interface Company {
  id: number;
  name: string;
  company_type: CompanyType;
  description: string;
  phone: string;
  wechat_id: string;
  website: string;
  moq: string | number | null;
  main_products: string;
  routes_serviced: string;
  average_rating: number | string | null;
  review_count: number;
  is_verified: boolean;
  has_owner: boolean;
  addresses: Address[];
  date_created?: string;
}

export interface ReviewPhoto {
  id: number;
  image: string;
}

export interface Review {
  id: number;
  company: number;
  company_name?: string;
  /** The author's customer id (not their user id); compare with Customer.id. */
  customer_id?: number;
  author_name: string;
  author_country: string;
  author_is_verified: boolean;
  rating: number;
  comment: string;
  photos: ReviewPhoto[];
  reply: string;
  reply_date?: string | null;
  date_created: string;
}

export interface Claim {
  id: number;
  company: number;
  company_name?: string;
  message: string;
  status: ReviewStatus;
  admin_note: string;
  reviewed_at: string | null;
  date_created: string;
  document_url: string | null;
}

export interface Verification {
  id: number;
  note: string;
  status: ReviewStatus;
  admin_note: string;
  reviewed_at: string | null;
  date_created: string;
  document_url: string | null;
}

/** A local file chosen on the device, ready for a multipart upload. */
export interface LocalFile {
  uri: string;
  name: string;
  type: string;
}
