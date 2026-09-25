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
  const response = await api.post<SignupResponse>("/auth/register/tenant", data);
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
  const response = await api.post<SignupResponse>("/auth/register/ngo", data);
  return response.data;
}

export async function getMe() {
  const response = await api.get<User>("/auth/me");
  return response.data;
}
