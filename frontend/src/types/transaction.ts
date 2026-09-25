export interface TransactionInventory {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  batch_number: string | null;
  purchase_date: string;
  expiry_date: string;
  is_deleted: boolean;
}

export interface TransactionDonation {
  id: number;
  tenant_id: number;
  inventory_id: number;

  quantity: number;
  committed_quantity: number;
  remaining_quantity: number;

  recipient_name: string | null;

  pickup_location: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;

  available_from: string | null;
  available_until: string | null;

  donation_status: string;

  note: string | null;

  donated_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  tenant_id: number;
  inventory_id: number;

  sale_id: string | null;

  transaction_type: string;
  quantity: number;

  note: string | null;
  created_at: string;

  inventory: TransactionInventory | null;

  donation: TransactionDonation | null;
}