import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Supplier } from '../../shared/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  constructor(private readonly api: ApiService) {}

  getAll(params?: Record<string, unknown>): Observable<Supplier[]> {
    return this.api.get<Supplier[]>('dashboard/suppliers', params);
  }

  create(payload: Supplier): Observable<Supplier> {
    return this.api
      .post<Supplier>('brands', { name: payload.name, category: payload.category })
      .pipe(map((brand) => ({ ...payload, id: brand.id })));
  }

  update(payload: Supplier): Observable<Supplier> {
    return this.api
      .put<Supplier>(`brands/${payload.id}`, { id: payload.id, name: payload.name, category: payload.category })
      .pipe(map(() => payload));
  }
}
