import { PositionStatus } from '../../../shared/models/position-status';

export type DesignerElementType =
  | 'Gondola'
  | 'Promo'
  | 'Stand'
  | 'Cash Register'
  | 'Entrance'
  | 'Display Case'
  | 'Shelf'
  | 'Door'
  | 'Window'
  | 'Wall'
  | 'Counter';

export interface DesignerElement {
  id: string;
  label: string;
  type: DesignerElementType;
  status: PositionStatus;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  category?: string;
  note?: string;
}
