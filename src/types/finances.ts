export type TransactionType = "income" | "expense" | "transfer_in" | "transfer_out";

export type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance_millimes: number;
  income_millimes: number;
  expense_millimes: number;
  balance_millimes: number;
};

export type Transaction = {
  id: string;
  account_id: string;
  transaction_type: TransactionType;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
  transfer_id?: string;
};