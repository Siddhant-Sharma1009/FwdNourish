export interface Donation {
  id: number;
  tenant_id: number;
  inventory_id: number;
  quantity: number;
  recipient_name: string | null;
  donation_status: string;
  note: string | null;
  donated_at: string | null;
  created_at: string;
}

export interface DonationCreate {
  tenant_id: number;
  inventory_id: number;
  quantity: number;
  recipient_name?: string;
  note?: string;
}