export interface RetailObject {
  id?: string;
  code: string;
  name: string;
  street: string;
  city: string;
  postalCode?: string;
  country?: string;
  layoutCount?: number;
  positionCount?: number;
}
