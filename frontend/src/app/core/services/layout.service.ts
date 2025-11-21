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

  selectElement(id: string | null): void {
    this.selectedId$.next(id);
  }

  loadDemoLayout(): void {
    const demo: DesignerElement[] = [
      this.createElement('Entrance', 'Ulaz kupaca', 'Available', 120, 60, 32, 32, 0),
      this.createElement('Gondola', 'Gondola A1', 'Occupied', 220, 110, 240, 64, 6),
      this.createElement('Promo', 'Promo zona', 'Reserved', 180, 120, 520, 84, -4),
      this.createElement('Stand', 'Stalak akcije', 'Available', 140, 160, 160, 240, 0),
      this.createElement('Cash Register', 'Blagajna 1', 'ExpiringSoon', 240, 120, 460, 280, 0),
      this.createElement('Gondola', 'Gondola B2', 'Inactive', 220, 110, 720, 180, 2)
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
