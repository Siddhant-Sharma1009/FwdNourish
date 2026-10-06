import api from "./api";
import type { User } from "../types/auth";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  message: string;
  user: User;
}

export interface UpdateProfileRequest {
  full_name: string;
  phone?: string | null;
}

export interface CompleteProfile {
  id: number;
  email: string;
  role: "ADMIN" | "TENANT" | "NGO";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  full_name: string;
  phone?: string | null;
  tenant_id?: number | null;
  rejection_reason?: string | null;

  // Organization information
  organization_type?: "TENANT" | "NGO" | null;
  organization_name?: string | null;
  business_type?: string | null;
  registration_number?: string | null;

  // Address
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;

  // Location
  latitude?: number | null;
  longitude?: number | null;
  google_maps_link?: string | null;

  // NGO
  service_radius_km?: number | null;

  // Online presence
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;

  description?: string | null;
}

export async function login(data: LoginRequest) {
  const response = await api.post<{
    access_token: string;
    token_type: string;
    user: User;
  }>("/auth/login", data);

  return response.data;
}

export async function registerTenant(data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  business_name: string;
  business_type: string;
}) {
  const response = await api.post<SignupResponse>(
    "/auth/register/tenant",
    data
  );

  return response.data;
}

export async function registerNgo(data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  organization_name: string;
  registration_number?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  service_radius_km: number;
}) {
  const response = await api.post<SignupResponse>(
    "/auth/register/ngo",
    data
  );

  return response.data;
}

export async function getMe() {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

export async function getProfile() {
  const response = await api.get<CompleteProfile>("/auth/profile");
  return response.data;
}

export async function updateProfile(
  data: UpdateProfileRequest
) {
  const response = await api.put<CompleteProfile>(
    "/auth/profile",
    data
  );

  return response.data;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export async function changePassword(data: ChangePasswordRequest) {
  const response = await api.put<{ message: string }>(
    "/auth/change-password",
    data
  );

  return response.data;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function forgotPassword(
  email: string
): Promise<ForgotPasswordResponse> {
  const response = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    {
      email,
    }
  );

  return response.data;
}

export async function resetPassword(
  token: string,
  password: string
): Promise<ResetPasswordResponse> {
  const response = await api.post<ResetPasswordResponse>(
    `/auth/reset-password/${encodeURIComponent(token)}`,
    {
      password,
    }
  );

  return response.data;
}