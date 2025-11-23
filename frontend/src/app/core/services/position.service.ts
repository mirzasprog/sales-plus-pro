import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Position } from '../../shared/models/position.model';

const POSITION_KEY = 'sales-plus-positions';

@Injectable({ providedIn: 'root' })
export class PositionService {
  private readonly positions$ = new BehaviorSubject<Position[]>([]);
  private initialized = false;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Position[]> {
    if (!this.initialized) {
      this.bootstrap();
    }
    return this.positions$.asObservable();
  }

  getById(id: string): Observable<Position | undefined> {
    return this.getAll().pipe(map((items) => items.find((item) => item.id === id)));
  }

  create(payload: Omit<Position, 'id'>): Observable<Position> {
    const next: Position = { ...payload, id: uuidv4() };
    this.persist([...this.positions$.value, next]);
    return this.getById(next.id) as Observable<Position>;
  }

  update(position: Position): Observable<Position> {
    this.persist(this.positions$.value.map((item) => (item.id === position.id ? position : item)));
    return this.getById(position.id) as Observable<Position>;
  }

  delete(id: string): Observable<void> {
    this.persist(this.positions$.value.filter((item) => item.id !== id));
    return this.positions$.pipe(map(() => void 0));
  }

  private bootstrap(): void {
    this.initialized = true;
    const cached = localStorage.getItem(POSITION_KEY);
    if (cached) {
      this.positions$.next(JSON.parse(cached) as Position[]);
      return;
    }

    this.http
      .get<Position[]>('assets/mock/positions.json')
      .pipe(tap((positions) => this.persist(positions)))
      .subscribe();
  }

  private persist(positions: Position[]): void {
    localStorage.setItem(POSITION_KEY, JSON.stringify(positions));
    this.positions$.next(positions);
  }
}
