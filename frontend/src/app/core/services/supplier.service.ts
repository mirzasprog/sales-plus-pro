import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Supplier } from '../../shared/models/supplier.model';

const SUPPLIER_KEY = 'sales-plus-suppliers';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly suppliers$ = new BehaviorSubject<Supplier[]>([]);
  private initialized = false;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Supplier[]> {
    if (!this.initialized) {
      this.bootstrap();
    }
    return this.suppliers$.asObservable();
  }

  getById(id: string): Observable<Supplier | undefined> {
    return this.getAll().pipe(map((items) => items.find((item) => item.id === id)));
  }

  create(payload: Omit<Supplier, 'id'>): Observable<Supplier> {
    const next: Supplier = { ...payload, id: uuidv4() };
    this.persist([...this.suppliers$.value, next]);
    return this.getById(next.id) as Observable<Supplier>;
  }

  update(supplier: Supplier): Observable<Supplier> {
    this.persist(this.suppliers$.value.map((item) => (item.id === supplier.id ? supplier : item)));
    return this.getById(supplier.id) as Observable<Supplier>;
  }

  delete(id: string): Observable<void> {
    this.persist(this.suppliers$.value.filter((item) => item.id !== id));
    return this.suppliers$.pipe(map(() => void 0));
  }

  private bootstrap(): void {
    this.initialized = true;
    const cached = localStorage.getItem(SUPPLIER_KEY);
    if (cached) {
      this.suppliers$.next(JSON.parse(cached) as Supplier[]);
      return;
    }

    this.http
      .get<Supplier[]>('assets/mock/suppliers.json')
      .pipe(tap((suppliers) => this.persist(suppliers)))
      .subscribe();
  }

  private persist(suppliers: Supplier[]): void {
    localStorage.setItem(SUPPLIER_KEY, JSON.stringify(suppliers));
    this.suppliers$.next(suppliers);
  }
}
