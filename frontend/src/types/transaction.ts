export interface Transaction {
  id: number;
  tenant_id: number;
  inventory_id: number;
  sale_id: string | null;
  transaction_type: string;
  quantity: number;
  note: string | null;
  created_at: string;
}