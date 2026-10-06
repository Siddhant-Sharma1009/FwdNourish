export type UserRole = "ADMIN" | "TENANT" | "NGO";
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  phone?: string | null;
  tenant_id?: number | null;
  rejection_reason?: string | null;
}

export interface AdminUser extends User {
  organization_name?: string | null;
  business_type?: string | null;
  created_at: string;
}
