export interface Supplier {
  id: string;
  name: string;
  category: string;
  activeContracts: number;
  activeStores: number;
  activePositions: number;
  activeRevenue: number;
  nextExpiry?: string;
}
