export interface Store {
  id: string;
  code: string;
  name: string;
  street: string;
  city: string;
  totalPositions: number;
  occupied: number;
  available: number;
  reserved: number;
  inactive: number;
  expiringContracts: number;
  activeRevenue: number;
  layoutCount: number;
}
