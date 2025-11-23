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
  supplier?: string;
  note?: string;
  updatedAt?: string;
  price?: number;
  contractStart?: string;
  contractEnd?: string;
}

export interface LayoutDefinition {
  id: string;
  name: string;
  objectId: string;
  boundaryWidth: number;
  boundaryHeight: number;
  elements: DesignerElement[];
  updatedAt: string;
}
