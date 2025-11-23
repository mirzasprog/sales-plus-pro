import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Contract } from '../../shared/models/contract.model';

const CONTRACT_KEY = 'sales-plus-contracts';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly contracts$ = new BehaviorSubject<Contract[]>([]);
  private initialized = false;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Contract[]> {
    if (!this.initialized) {
      this.bootstrap();
    }
    return this.contracts$.asObservable();
  }

  getById(id: string): Observable<Contract | undefined> {
    return this.getAll().pipe(map((items) => items.find((item) => item.id === id)));
  }

  create(payload: Omit<Contract, 'id'>): Observable<Contract> {
    const next: Contract = { ...payload, id: uuidv4() };
    this.persist([...this.contracts$.value, next]);
    return this.getById(next.id) as Observable<Contract>;
  }

  update(contract: Contract): Observable<Contract> {
    this.persist(this.contracts$.value.map((item) => (item.id === contract.id ? contract : item)));
    return this.getById(contract.id) as Observable<Contract>;
  }

  delete(id: string): Observable<void> {
    this.persist(this.contracts$.value.filter((item) => item.id !== id));
    return this.contracts$.pipe(map(() => void 0));
  }

  private bootstrap(): void {
    this.initialized = true;
    const cached = localStorage.getItem(CONTRACT_KEY);
    if (cached) {
      this.contracts$.next(JSON.parse(cached) as Contract[]);
      return;
    }

    this.http
      .get<Contract[]>('assets/mock/contracts.json')
      .pipe(tap((contracts) => this.persist(contracts)))
      .subscribe();
  }

  private persist(contracts: Contract[]): void {
    localStorage.setItem(CONTRACT_KEY, JSON.stringify(contracts));
    this.contracts$.next(contracts);
  }
}
