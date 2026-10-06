export interface ExpiryStatus {
  inventory_id: number;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  days_remaining: number;
  expiry_threshold_days: number;
  status: "SAFE" | "CRITICAL" | "EXPIRED";
  alert: boolean;
}