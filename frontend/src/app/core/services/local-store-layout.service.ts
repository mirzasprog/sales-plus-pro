import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { LayoutDefinition } from '../../features/layout-designer/models/designer-element';

const STORAGE_KEY = 'sales-plus-layouts';

@Injectable({ providedIn: 'root' })
export class LocalStoreLayoutService {
  private cache: LayoutDefinition[] | null = null;

  constructor(private readonly http: HttpClient) {}

  loadLayouts(): Observable<LayoutDefinition[]> {
    if (this.cache) {
      return of(this.cache);
    }

    const stored = this.getStoredLayouts();
    if (stored.length) {
      this.cache = stored;
      return of(stored);
    }

    return this.http.get<LayoutDefinition[]>('assets/mock/layouts.json').pipe(tap((layouts) => (this.cache = layouts)));
  }

  getLayoutById(id: string): Observable<LayoutDefinition | undefined> {
    return this.loadLayouts().pipe(map((layouts) => layouts.find((layout) => layout.id === id)));
  }

  saveLayout(layout: LayoutDefinition): Observable<LayoutDefinition> {
    return this.loadLayouts().pipe(
      tap((layouts) => {
        const next = layouts.some((l) => l.id === layout.id)
          ? layouts.map((l) => (l.id === layout.id ? layout : l))
          : [...layouts, layout];
        this.persist(next);
        this.cache = next;
      }),
      map(() => layout)
    );
  }

  deleteLayout(id: string): Observable<void> {
    return this.loadLayouts().pipe(
      tap((layouts) => {
        const next = layouts.filter((l) => l.id !== id);
        this.persist(next);
        this.cache = next;
      }),
      map(() => void 0)
    );
  }

  private getStoredLayouts(): LayoutDefinition[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as LayoutDefinition[];
    } catch (err) {
      console.warn('Failed to parse stored layouts', err);
      return [];
    }
  }

  private persist(layouts: LayoutDefinition[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  }
}
