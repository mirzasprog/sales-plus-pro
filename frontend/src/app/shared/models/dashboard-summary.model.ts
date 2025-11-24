import { Supplier } from './supplier.model';

export interface ExpiringContract {
  id: string;
  supplier: string;
  store: string;
  position: string;
  endDate: string;
  value: number;
}

export interface DashboardSummary {
  totalPositions: number;
  availablePositions: number;
  occupiedPositions: number;
  reservedPositions: number;
  expiringSoonPositions: number;
  inactivePositions: number;
  expiringContracts: number;
  coveragePercent: number;
  topSuppliers: Supplier[];
  expiringContractsList: ExpiringContract[];
}
