import api from "./api";
import type {
  NGORequirement,
  NGORequirementCreate,
} from "../types/ngoRequirement";

export async function createNGORequirement(
  data: NGORequirementCreate
): Promise<NGORequirement> {
  const response = await api.post(
    "/ngo/requirements/",
    data
  );

  return response.data;
}

export async function getNGORequirements(): Promise<NGORequirement[]> {
  const response = await api.get(
    "/ngo/requirements/"
  );

  return response.data;
}

export async function getNGORequirement(
  requirementId: number
): Promise<NGORequirement> {
  const response = await api.get(
    `/ngo/requirements/${requirementId}`
  );

  return response.data;
}

export async function cancelNGORequirement(
  requirementId: number
): Promise<NGORequirement> {
  const response = await api.patch(
    `/ngo/requirements/${requirementId}/cancel`
  );

  return response.data;
}