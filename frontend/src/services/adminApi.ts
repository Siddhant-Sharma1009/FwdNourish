import api from "./api";
import type {
  AdminUser,
  User,
} from "../types/auth";

export interface AdminStats {
  total_users: number;
  pending_tenants: number;
  pending_ngos: number;
  active_tenants: number;
  active_ngos: number;
  suspended_users: number;
}

export interface AdminUserDetails extends AdminUser {
  registration_number: string | null;

  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;

  latitude: number | null;
  longitude: number | null;

  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  google_maps_link: string | null;

  description: string | null;

  service_radius_km: number | null;

  verified_at: string | null;
  verified_by: number | null;

  created_at: string;
}

export async function getAdminStats() {
  return (
    await api.get<AdminStats>("/admin/stats")
  ).data;
}

export async function getAdminUsers(
  params?: {
    role?: string;
    status?: string;
  }
) {
  return (
    await api.get<AdminUser[]>(
      "/admin/users",
      { params }
    )
  ).data;
}

/* =========================================================
   ACCOUNT REVIEW
========================================================= */

export async function getAdminUser(userId: number) {
  return (
    await api.get<AdminUserDetails>(
      `/admin/users/${userId}`
    )
  ).data;
}

/* =========================================================
   ACCOUNT ACTIONS
========================================================= */

export async function approveUser(userId: number) {
  return (
    await api.patch<AdminUser>(
      `/admin/users/${userId}/approve`
    )
  ).data;
}

export async function rejectUser(
  userId: number,
  reason?: string
) {
  return (
    await api.patch<AdminUser>(
      `/admin/users/${userId}/reject`,
      {
        reason,
      }
    )
  ).data;
}

export async function suspendUser(
  userId: number,
  reason?: string
) {
  return (
    await api.patch<AdminUser>(
      `/admin/users/${userId}/suspend`,
      {
        reason,
      }
    )
  ).data;
}

export async function reactivateUser(userId: number) {
  return (
    await api.patch<AdminUser>(
      `/admin/users/${userId}/reactivate`
    )
  ).data;
}

export async function getAuditLogs() {
  return (
    await api.get("/admin/audit-logs")
  ).data;
}

export async function removeUser(userId: number) {
  return (
    await api.delete(`/admin/users/${userId}`)
  ).data;
}