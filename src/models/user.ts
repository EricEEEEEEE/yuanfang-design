export enum UserRole {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  CAMPUS_ADMIN = "CAMPUS_ADMIN",
  USER = "USER",
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  campusId: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  phone: string;
  name: string;
  role: UserRole;
  campusId: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  campusId?: string;
  isActive?: boolean;
}
