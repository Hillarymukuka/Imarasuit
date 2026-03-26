// Core shared types used across all modules

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  iban?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  logo?: string;
  address: Address;
  phone: string;
  email: string;
  website?: string;
  tin: string;
  bankInfo: BankInfo;
  createdAt: string;
  updatedAt: string;
}
