import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay, startWith, switchMap, take } from 'rxjs/operators';
import { StoreService } from '../../../core/services/store.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportExportService } from '../../../core/services/report-export.service';
import { Store } from '../../../shared/models/store.model';

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

  readonly createForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    street: ['', Validators.required],
    city: ['', Validators.required],
    totalPositions: [0, [Validators.required, Validators.min(0)]],
    occupied: [0, [Validators.required, Validators.min(0)]],
    available: [0, [Validators.required, Validators.min(0)]],
    reserved: [0, [Validators.required, Validators.min(0)]],
    inactive: [0, [Validators.required, Validators.min(0)]],
    expiringContracts: [0, [Validators.required, Validators.min(0)]],
    activeRevenue: [0, [Validators.required, Validators.min(0)]],
    layoutCount: [0, [Validators.required, Validators.min(0)]]
  });

  stores$!: Observable<Store[]>;
  summary$!: Observable<{ occupancy: number; free: number; revenue: number; expiring: number }>;
  editingStore: Store | null = null;

  readonly editForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    street: ['', Validators.required],
    city: ['', Validators.required],
    totalPositions: [0, [Validators.required, Validators.min(0)]],
    occupied: [0, [Validators.required, Validators.min(0)]],
    available: [0, [Validators.required, Validators.min(0)]],
    reserved: [0, [Validators.required, Validators.min(0)]],
    inactive: [0, [Validators.required, Validators.min(0)]],
    expiringContracts: [0, [Validators.required, Validators.min(0)]],
    activeRevenue: [0, [Validators.required, Validators.min(0)]],
    layoutCount: [0, [Validators.required, Validators.min(0)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly storeService: StoreService,
    private readonly notifications: NotificationService,
    private readonly reportExport: ReportExportService
  ) {}

  ngOnInit(): void {
    const filters$ = this.filterForm.valueChanges.pipe(startWith(this.filterForm.value));

    this.stores$ = filters$
      .pipe(
        switchMap((filters) =>
          this.storeService.getAll().pipe(
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
        ),
        // cache the filtered result for reuse in exports
        shareReplay(1)
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

  addStore(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.value;
    this.storeService
      .create({
        code: value.code ?? '',
        name: value.name ?? '',
        street: value.street ?? '',
        city: value.city ?? '',
        totalPositions: Number(value.totalPositions ?? 0),
        occupied: Number(value.occupied ?? 0),
        available: Number(value.available ?? 0),
        reserved: Number(value.reserved ?? 0),
        inactive: Number(value.inactive ?? 0),
        expiringContracts: Number(value.expiringContracts ?? 0),
        activeRevenue: Number(value.activeRevenue ?? 0),
        layoutCount: Number(value.layoutCount ?? 0)
      })
      .subscribe(() => {
        this.notifications.push({ message: 'Novi objekat dodan', type: 'success' });
        this.createForm.reset({
          code: '',
          name: '',
          street: '',
          city: '',
          totalPositions: 0,
          occupied: 0,
          available: 0,
          reserved: 0,
          inactive: 0,
          expiringContracts: 0,
          activeRevenue: 0,
          layoutCount: 0
        });
      });
  }

  startEdit(store: Store): void {
    this.editingStore = store;
    this.editForm.patchValue({
      code: store.code,
      name: store.name,
      street: store.street,
      city: store.city,
      totalPositions: store.totalPositions,
      occupied: store.occupied,
      available: store.available,
      reserved: store.reserved,
      inactive: store.inactive,
      expiringContracts: store.expiringContracts,
      activeRevenue: store.activeRevenue,
      layoutCount: store.layoutCount
    });
  }

  cancelEdit(): void {
    this.editingStore = null;
    this.editForm.reset({
      code: '',
      name: '',
      street: '',
      city: '',
      totalPositions: 0,
      occupied: 0,
      available: 0,
      reserved: 0,
      inactive: 0,
      expiringContracts: 0,
      activeRevenue: 0,
      layoutCount: 0
    });
  }

  saveEdit(): void {
    if (!this.editingStore) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.value;
    const updated: Store = {
      ...this.editingStore,
      code: value.code ?? '',
      name: value.name ?? '',
      street: value.street ?? '',
      city: value.city ?? '',
      totalPositions: Number(value.totalPositions ?? 0),
      occupied: Number(value.occupied ?? 0),
      available: Number(value.available ?? 0),
      reserved: Number(value.reserved ?? 0),
      inactive: Number(value.inactive ?? 0),
      expiringContracts: Number(value.expiringContracts ?? 0),
      activeRevenue: Number(value.activeRevenue ?? 0),
      layoutCount: Number(value.layoutCount ?? 0)
    };

    this.storeService.update(updated).subscribe(() => {
      this.notifications.push({ message: `${updated.name} ažuriran`, type: 'success' });
      this.cancelEdit();
    });
  }

  exportReport(): void {
    combineLatest([this.stores$, this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))])
      .pipe(take(1))
      .subscribe(([stores, filters]) => {
        this.reportExport.exportToXlsx({
          data: stores,
          fileName: 'objekti-izvjestaj',
          worksheetName: 'Objekti',
          criteria: {
            Pretraga: filters.search || undefined,
            Grad: filters.city || undefined,
            'Ističe u (dana)': filters.expiringInDays || undefined
          },
          mapRow: (store) => ({
            Šifra: store.code,
            Naziv: store.name,
            Adresa: `${store.street}, ${store.city}`,
            'Pozicije ukupno': store.totalPositions,
            Zauzeto: store.occupied,
            Slobodno: store.available,
            Rezervisano: store.reserved,
            Neaktivno: store.inactive,
            'Ističe ugovora': store.expiringContracts,
            Prihod: store.activeRevenue,
            'Broj nacrta': store.layoutCount
          })
        });
        this.notifications.push({ message: 'XLSX izvještaj za objekte generisan', type: 'success' });
      });
  }
}
