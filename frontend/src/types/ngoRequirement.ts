export interface NGORequirement {
  id: number;
  ngo_id: number;
  food_name: string;
  food_category: string | null;
  quantity_required: number;
  unit: string;
  required_by: string;
  max_distance_km: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NGORequirementCreate {
  food_name: string;
  food_category?: string;
  quantity_required: number;
  unit: string;
  required_by: string;
  max_distance_km: number;
  notes?: string;
}