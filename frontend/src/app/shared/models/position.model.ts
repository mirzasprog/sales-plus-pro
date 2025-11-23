import { PositionStatus } from './position-status';

export interface Position {
  id: string;
  name: string;
  positionType: string;
  status: PositionStatus;
  retailObjectName: string;
  supplier?: string;
  widthCm: number;
  heightCm: number;
  note?: string;
}
