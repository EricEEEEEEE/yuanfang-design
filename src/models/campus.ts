export interface Campus {
  id: string;
  name: string;
  address: string;
  phone: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCampusInput {
  name: string;
  address: string;
  phone: string;
}

export interface UpdateCampusInput {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface CampusBalanceOperation {
  campusId: string;
  amount: number;
  operatorId: string;
  reason: string;
}
