export enum Role {
  INVESTOR = 'INVESTOR',
  PROJECT_OWNER = 'PROJECT_OWNER',
  ADMIN_PUSAT = 'ADMIN_PUSAT',
  ADMIN_DAPUR = 'ADMIN_DAPUR',
  PRODUKSI = 'PRODUKSI',
  BUYER = 'BUYER',
  SUPPLIER = 'SUPPLIER',
  ADMIN = 'ADMIN',
  ADMIN_INVESTMENT = 'ADMIN_INVESTMENT',
  ADMIN_TRADING = 'ADMIN_TRADING',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MICRO_INVESTOR = 'MICRO_INVESTOR'
}

export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  fullname?: string | null;
  whatsapp?: string | null;
  noRekening?: string | null;
  namaRekening?: string | null;
  role: Role;
  kycDocs?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  fullName?: string;
  fullname?: string;
  whatsapp?: string;
  noRekening?: string;
  namaRekening?: string;
  password: string;
  role: Role;
  kycDocs?: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string | null;
  fullname?: string | null;
  whatsapp?: string | null;
  noRekening?: string | null;
  namaRekening?: string | null;
  role?: Role;
  kycDocs?: string;
  password?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserFilters {
  role?: Role;
  search?: string;
  page?: number;
  limit?: number;
}