import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, of, switchMap, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { DesignerElement, LayoutDefinition } from '../../features/layout-designer/models/designer-element';
import { LocalStoreLayoutService } from './local-store-layout.service';
import { PositionStatus } from '../../shared/models/position-status';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly elements$ = new BehaviorSubject<DesignerElement[]>([]);
  private readonly selectedIds$ = new BehaviorSubject<string[]>([]);
  private readonly activeLayout$ = new BehaviorSubject<LayoutDefinition | null>(null);

  private readonly history: DesignerElement[][] = [];
  private readonly future: DesignerElement[][] = [];

  readonly canvas$ = this.elements$.asObservable();
  readonly selectedElements$ = combineLatest([this.canvas$, this.selectedIds$]).pipe(
    map(([elements, ids]) => elements.filter((element) => ids.includes(element.id)))
  );
  readonly selectedElement$ = this.selectedElements$.pipe(map((items) => items[0] ?? null));
  readonly layoutMeta$ = this.activeLayout$.asObservable();

  constructor(private readonly store: LocalStoreLayoutService) {}

  get snapshot(): DesignerElement[] {
    return this.elements$.value;
  }

  get selectedIds(): string[] {
    return this.selectedIds$.value;
  }

  loadDemoLayout(): void {
    this.store
      .loadLayouts()
      .pipe(
        map((layouts) => layouts[0]),
        tap((layout) => this.applyLayout(layout))
      )
      .subscribe();
  }

  loadLayout(id: string): Observable<LayoutDefinition | undefined> {
    return this.store.getLayoutById(id).pipe(tap((layout) => this.applyLayout(layout)));
  }

  loadLayoutForObject(objectId: string): Observable<LayoutDefinition | undefined> {
    return this.store.getLayoutByObjectId(objectId).pipe(tap((layout) => this.applyLayout(layout)));
  }

  saveLayout(name: string | null = null): Observable<LayoutDefinition | null> {
    const current = this.activeLayout$.value;
    if (!current) {
      return of(null);
    }

    const next: LayoutDefinition = {
      ...current,
      name: name ?? current.name,
      elements: this.elements$.value,
      updatedAt: new Date().toISOString()
    };

    return this.store.saveLayout(next).pipe(tap((layout) => this.activeLayout$.next(layout)));
  }

  startNewLayoutForObject(
    objectId: string,
    name: string,
    boundaryWidth = 1200,
    boundaryHeight = 800
  ): LayoutDefinition {
    const layout: LayoutDefinition = {
      id: uuidv4(),
      name,
      objectId,
      boundaryWidth,
      boundaryHeight,
      elements: [],
      updatedAt: new Date().toISOString()
    };

    this.applyLayout(layout);
    return layout;
  }

  clearActiveLayout(): void {
    this.applyLayout(undefined);
  }

  addElement(element: DesignerElement): void {
    const next = [...this.elements$.value, element];
    this.commit(next);
    this.selectedIds$.next([element.id]);
  }

  updateElement(element: DesignerElement): void {
    const next = this.elements$.value.map((item) => (item.id === element.id ? element : item));
    this.commit(next);
    this.selectedIds$.next([element.id]);
  }

  removeElement(id: string): void {
    const next = this.elements$.value.filter((item) => item.id !== id);
    this.commit(next);
    this.selectedIds$.next([]);
  }

  clearLayout(): void {
    this.commit([]);
    this.selectedIds$.next([]);
  }

  selectElements(ids: string[]): void {
    this.selectedIds$.next(ids);
  }

  selectElement(id: string | null): void {
    this.selectElements(id ? [id] : []);
  }

  undo(): void {
    if (!this.history.length) {
      return;
    }
    const current = this.history.pop();
    if (!current) {
      return;
    }
    this.future.push(this.elements$.value);
    this.elements$.next(current);
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) {
      return;
    }
    this.history.push(this.clone(this.elements$.value));
    this.elements$.next(next);
  }

  importElements(elements: DesignerElement[]): void {
    this.commit(elements);
  }

  syncPositionOnLayout(position: {
    id: string;
    name: string;
    positionType: string;
    status: PositionStatus;
    widthCm: number;
    heightCm: number;
    supplier?: string;
    note?: string;
    retailObjectId: string;
    retailObjectName?: string;
  }): Observable<LayoutDefinition | null> {
    if (!position.retailObjectId) {
      return of(null);
    }

    const normalizedType = this.normalizeType(position.positionType);
    const now = new Date().toISOString();

    return this.store
      .getLayoutByObjectId(position.retailObjectId)
      .pipe(
        switchMap((layout) => {
          const baseLayout: LayoutDefinition =
            layout ??
            this.createLayoutDefinition(
              position.retailObjectId,
              position.retailObjectName ?? `${position.retailObjectId} - nacrt`
            );

          const existingIndex = baseLayout.elements.findIndex((element) => element.id === position.id);
          const fallbackPosition = this.defaultPosition(baseLayout.elements.length);
          const element = {
            id: position.id,
            label: position.name,
            type: normalizedType,
            status: position.status,
            width: position.widthCm,
            height: position.heightCm,
            x: existingIndex >= 0 ? baseLayout.elements[existingIndex].x : fallbackPosition.x,
            y: existingIndex >= 0 ? baseLayout.elements[existingIndex].y : fallbackPosition.y,
            rotation: existingIndex >= 0 ? baseLayout.elements[existingIndex].rotation : 0,
            supplier: position.supplier,
            note: position.note,
            updatedAt: now
          };

          const elements = existingIndex >= 0
            ? baseLayout.elements.map((item, index) => (index === existingIndex ? element : item))
            : [...baseLayout.elements, element];

          const updatedLayout: LayoutDefinition = {
            ...baseLayout,
            elements,
            updatedAt: now
          };

          return this.store.saveLayout(updatedLayout);
        }),
        tap((layout) => {
          if (layout && this.activeLayout$.value?.id === layout.id) {
            this.applyLayout(layout);
          }
        })
      );
  }

  setBoundary(width: number, height: number): void {
    const layout = this.activeLayout$.value;
    if (!layout) {
      return;
    }
    this.activeLayout$.next({ ...layout, boundaryWidth: width, boundaryHeight: height });
  }

  private applyLayout(layout?: LayoutDefinition): void {
    if (!layout) {
      this.activeLayout$.next(null);
      this.elements$.next([]);
      this.history.length = 0;
      this.future.length = 0;
      return;
    }
    this.activeLayout$.next(layout);
    this.elements$.next(layout.elements);
    this.selectedIds$.next([]);
    this.history.length = 0;
    this.future.length = 0;
    this.history.push(this.clone(layout.elements));
  }

  private commit(elements: DesignerElement[]): void {
    this.history.push(this.clone(this.elements$.value));
    this.future.length = 0;
    this.elements$.next(elements);
  }

  private clone(elements: DesignerElement[]): DesignerElement[] {
    return elements.map((el) => ({ ...el }));
  }

  private createLayoutDefinition(objectId: string, name: string): LayoutDefinition {
    return {
      id: uuidv4(),
      name,
      objectId,
      boundaryWidth: 1200,
      boundaryHeight: 800,
      elements: [],
      updatedAt: new Date().toISOString()
    };
  }

  private normalizeType(type: string): DesignerElement['type'] {
    const allowed: DesignerElement['type'][] = [
      'Gondola',
      'Promo',
      'Stand',
      'Cash Register',
      'Entrance',
      'Display Case',
      'Shelf',
      'Door',
      'Window',
      'Wall',
      'Counter'
    ];
    return (allowed.find((item) => item.toLowerCase() === type.toLowerCase()) ?? 'Stand') as DesignerElement['type'];
  }

  private defaultPosition(index: number): { x: number; y: number } {
    const spacing = 40;
    return { x: 60 + (index % 5) * spacing, y: 60 + Math.floor(index / 5) * spacing };
  }
}
