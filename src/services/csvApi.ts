import api from "./api";

export interface CSVUploadResult {
  success: boolean;
  message: string;
  inserted: number;
  failed: number;
  errors: {
    row: number;
    sku?: string;
    error: string;
  }[];
}

export async function uploadInventoryCSV(
  tenantId: number,
  file: File
): Promise<CSVUploadResult> {

  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post<CSVUploadResult>(
    "/inventory/upload-csv",
    formData,
    {
      params: {
        tenant_id: tenantId,
      },
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}