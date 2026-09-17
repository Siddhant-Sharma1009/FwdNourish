import api from "./api";

import type {
  Transaction,
} from "../types/transaction";


export interface TransactionCreate {
  tenant_id: number;
  inventory_id: number;
  transaction_type: string;
  quantity: number;
  note?: string;
}


export interface TransactionResponse {
  id: number;
  tenant_id: number;
  inventory_id: number;
  transaction_type: string;
  quantity: number;
  note: string | null;
  created_at: string;
}


export async function createTransaction(
  data: TransactionCreate
): Promise<TransactionResponse> {

  const response =
    await api.post<TransactionResponse>(
      "/transactions/",
      data
    );

  return response.data;
}


export async function getTransactions(
  tenantId: number
): Promise<Transaction[]> {

  const response =
    await api.get<Transaction[]>(
      "/transactions/",
      {
        params: {
          tenant_id: tenantId,
        },
      }
    );

  return response.data;
}