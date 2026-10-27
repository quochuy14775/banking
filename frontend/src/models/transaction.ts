export type TransactionType = 'in' | 'out';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  desc: string;
  amount: number;
}
