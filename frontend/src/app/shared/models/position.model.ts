import { PositionStatus } from './position-status';

export interface Position {
  id: string;
  name: string;
  positionType: string;
  status: PositionStatus;
  retailObjectId: string;
  retailObjectName: string;
  supplierId?: string;
  supplier?: string;
  widthCm: number;
  heightCm: number;
  note?: string;
}
