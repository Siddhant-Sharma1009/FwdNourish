import api from "./api";

export interface NGORequirementOption {
  id: number;
  food_name: string;
  food_category: string | null;
  quantity_required: number;
  unit: string;
  required_by: string;
  max_distance_km: number | null;
  notes: string | null;
  status: string;
}

export interface NGOOption {
  id: number;
  user_id: number;

  organization_name: string;
  registration_number: string;

  full_name: string;
  phone: string;

  address: string;
  city: string;
  state: string;
  pincode: string;

  latitude: number | null;
  longitude: number | null;

  service_radius_km: number;

  description: string | null;

  requirements: NGORequirementOption[];
}

export async function getAvailableNGOs(): Promise<NGOOption[]> {
  const response = await api.get<NGOOption[]>(
    "/ngos/available"
  );

  return response.data;
}