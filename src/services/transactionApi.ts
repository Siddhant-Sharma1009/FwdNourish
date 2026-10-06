import api from "./api";

import type { Transaction } from "../types/transaction";

export interface TransactionCreate {
  tenant_id: number;
  inventory_id: number;
  transaction_type: string;
  quantity: number;
  note?: string;
  sale_id?: string;
  donation_id?: number;
}

export interface TransactionResponse extends Transaction {}

export async function createTransaction(
  data: TransactionCreate
): Promise<TransactionResponse> {
  const response = await api.post<TransactionResponse>(
    "/transactions/",
    data
  );

  return response.data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await api.get<Transaction[]>(
    "/transactions/"
  );

  return response.data;
}