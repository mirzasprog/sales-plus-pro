import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

interface StoreMetrics {
  id: string;
  code: string;
  name: string;
  street: string;
  city: string;
  totalPositions: number;
  occupied: number;
  available: number;
  reserved: number;
  inactive: number;
  expiringContracts: number;
  activeRevenue: number;
  layoutCount: number;
}

@Component({
  selector: 'app-store-list-page',
  templateUrl: './store-list-page.component.html',
  styleUrls: ['./store-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreListPageComponent implements OnInit {
  readonly filterForm = this.fb.group({
    search: [''],
    city: [''],
    expiringInDays: [30]
  });

  stores$!: Observable<StoreMetrics[]>;
  summary$!: Observable<{ occupancy: number; free: number; revenue: number; expiring: number }>;

  constructor(private readonly fb: FormBuilder, private readonly api: ApiService) {}

  ngOnInit(): void {
    const filters$ = this.filterForm.valueChanges.pipe(startWith(this.filterForm.value));

    this.stores$ = filters$.pipe(
      switchMap((filters) =>
        this.api.get<StoreMetrics[]>('dashboard/stores', { expiringInDays: filters.expiringInDays ?? 30 }).pipe(
          map((stores) =>
            stores.filter((store) =>
              [store.name, store.code, store.city]
                .join(' ')
                .toLowerCase()
                .includes((filters.search ?? '').toLowerCase()) &&
              (filters.city ? store.city.toLowerCase().includes(filters.city.toLowerCase()) : true)
            )
          )
        )
      )
    );

    this.summary$ = this.stores$.pipe(
      map((stores) => {
        const total = stores.reduce((acc, s) => acc + s.totalPositions, 0) || 1;
        const occupied = stores.reduce((acc, s) => acc + s.occupied, 0);
        const free = stores.reduce((acc, s) => acc + s.available, 0);
        const revenue = stores.reduce((acc, s) => acc + s.activeRevenue, 0);
        const expiring = stores.reduce((acc, s) => acc + s.expiringContracts, 0);

        return {
          occupancy: Math.round((occupied / total) * 100),
          free,
          revenue,
          expiring
        };
      })
    );
  }
}
