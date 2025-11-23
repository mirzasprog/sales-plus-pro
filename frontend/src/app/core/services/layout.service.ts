import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { DesignerElement } from '../../features/layout-designer/models/designer-element';
import { PositionStatus } from '../../shared/models/position-status';

@Injectable()
export class LayoutService {
  private readonly elements$ = new BehaviorSubject<DesignerElement[]>([]);
  private readonly selectedId$ = new BehaviorSubject<string | null>(null);
  readonly canvas$ = this.elements$.asObservable();
  readonly selectedElement$ = combineLatest([this.canvas$, this.selectedId$]).pipe(
    map(([elements, selectedId]) => elements.find((element) => element.id === selectedId) ?? null)
  );

  get snapshot(): DesignerElement[] {
    return this.elements$.value;
  }

  setElements(elements: DesignerElement[]): void {
    this.elements$.next(elements);
  }

  addElement(element: DesignerElement): void {
    this.elements$.next([...this.elements$.value, element]);
    this.selectedId$.next(element.id);
  }

  updateElement(element: DesignerElement): void {
    this.elements$.next(this.elements$.value.map((item) => (item.id === element.id ? element : item)));
  }

  removeElement(id: string): void {
    this.elements$.next(this.elements$.value.filter((item) => item.id !== id));
    if (this.selectedId$.value === id) {
      this.selectedId$.next(null);
    }
  }

  clearLayout(): void {
    this.setElements([]);
    this.selectElement(null);
  }

  selectElement(id: string | null): void {
    this.selectedId$.next(id);
  }

  loadDemoLayout(): void {
    const demo: DesignerElement[] = [
      this.createElement('Entrance', 'Ulaz kupaca', 'Available', 120, 60, 120, 60, 0),
      this.createElement('Door', 'Servisni ulaz', 'Available', 100, 24, 1080, 120, 0),
      this.createElement('Window', 'Izlog prema ulici', 'Available', 220, 20, 60, 340, 0),
      this.createElement('Wall', 'Nosivi zid', 'Inactive', 1260, 22, 40, 24, 0),
      this.createElement('Wall', 'Pregradni zid', 'Inactive', 22, 660, 40, 44, 0),
      this.createElement('Gondola', 'Gondola A1', 'Occupied', 220, 110, 320, 120, 6),
      this.createElement('Gondola', 'Gondola A2', 'Reserved', 220, 110, 580, 140, 4),
      this.createElement('Promo', 'Promo zona', 'Reserved', 200, 140, 880, 200, -4),
      this.createElement('Stand', 'Stalak akcije', 'Available', 140, 160, 640, 360, 0),
      this.createElement('Cash Register', 'Blagajna 1', 'ExpiringSoon', 240, 120, 260, 420, 0),
      this.createElement('Cash Register', 'Blagajna 2', 'Available', 240, 120, 540, 440, 0),
      this.createElement('Shelf', 'Polica visokog reda', 'Occupied', 160, 320, 980, 380, 0),
      this.createElement('Display Case', 'Vitrina za delikates', 'Available', 200, 140, 1000, 120, 0),
      this.createElement('Counter', 'Pult za degustaciju', 'ExpiringSoon', 220, 120, 820, 460, 0)
    ];
    this.setElements(demo);
    this.selectElement(null);
  }

  private createElement(
    type: DesignerElement['type'],
    label: string,
    status: PositionStatus,
    width: number,
    height: number,
    x: number,
    y: number,
    rotation = 0
  ): DesignerElement {
    return {
      id: uuidv4(),
      type,
      label,
      status,
      width,
      height,
      x,
      y,
      rotation,
      note: type === 'Promo' ? 'Istaknuta akcijska zona s velikom vidljivošću' : undefined
    };
  }
}
