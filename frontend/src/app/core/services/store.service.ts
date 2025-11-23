import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../../shared/models/store.model';

const STORE_KEY = 'sales-plus-stores';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly stores$ = new BehaviorSubject<Store[]>([]);
  private initialized = false;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Store[]> {
    if (!this.initialized) {
      this.bootstrap();
    }
    return this.stores$.asObservable();
  }

  getById(id: string): Observable<Store | undefined> {
    return this.getAll().pipe(map((stores) => stores.find((s) => s.id === id)));
  }

  create(store: Omit<Store, 'id'>): Observable<Store> {
    const next: Store = { ...store, id: uuidv4() };
    this.persist([...this.stores$.value, next]);
    return this.getById(next.id) as Observable<Store>;
  }

  update(store: Store): Observable<Store> {
    this.persist(this.stores$.value.map((item) => (item.id === store.id ? store : item)));
    return this.getById(store.id) as Observable<Store>;
  }

  delete(id: string): Observable<void> {
    this.persist(this.stores$.value.filter((item) => item.id !== id));
    return this.stores$.pipe(map(() => void 0));
  }

  private bootstrap(): void {
    this.initialized = true;
    const cached = localStorage.getItem(STORE_KEY);
    if (cached) {
      this.stores$.next(JSON.parse(cached) as Store[]);
      return;
    }

    this.http
      .get<Store[]>('assets/mock/stores.json')
      .pipe(tap((stores) => this.persist(stores)))
      .subscribe();
  }

  private persist(stores: Store[]): void {
    localStorage.setItem(STORE_KEY, JSON.stringify(stores));
    this.stores$.next(stores);
  }
}
