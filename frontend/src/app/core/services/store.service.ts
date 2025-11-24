import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Store } from '../../shared/models/store.model';
import { RetailObject } from '../../shared/models/retail-object.model';

@Injectable({ providedIn: 'root' })
export class StoreService {
  constructor(private readonly api: ApiService) {}

  getAll(params?: Record<string, unknown>): Observable<Store[]> {
    return this.api.get<Store[]>('dashboard/stores', params);
  }

  create(payload: RetailObject): Observable<Store> {
    return this.api
      .post<RetailObject>('retailobjects', {
        code: payload.code,
        name: payload.name,
        street: payload.street,
        city: payload.city,
        postalCode: payload.postalCode,
        country: payload.country
      })
      .pipe(map((store) => this.toStore(store)));
  }

  update(store: RetailObject): Observable<Store> {
    return this.api
      .put<RetailObject>(`retailobjects/${store.id}`, store)
      .pipe(map((updated) => this.toStore(updated)));
  }

  private toStore(store: RetailObject): Store {
    return {
      id: store.id ?? '',
      code: store.code,
      name: store.name,
      street: store.street,
      city: store.city,
      totalPositions: store.positionCount ?? 0,
      occupied: 0,
      available: 0,
      reserved: 0,
      inactive: 0,
      expiringContracts: 0,
      activeRevenue: 0,
      layoutCount: store.layoutCount ?? 0
    };
  }
}
