export enum TransactionType {
  RECHARGE = "RECHARGE",
  CONSUME = "CONSUME",
  REFUND = "REFUND",
}

export interface Transaction {
  id: string;
  campusId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  referenceId: string;
  operatorId: string;
  createdAt: string;
}

export interface CreateTransactionInput {
  campusId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  referenceId: string;
  operatorId: string;
}
