import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay, startWith, switchMap, take } from 'rxjs/operators';
import { PositionService } from '../../../core/services/position.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportExportService } from '../../../core/services/report-export.service';
import { StoreService } from '../../../core/services/store.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { Store } from '../../../shared/models/store.model';
import { Supplier } from '../../../shared/models/supplier.model';
import { PositionStatus } from '../../../shared/models/position-status';
import { Position } from '../../../shared/models/position.model';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-positions-page',
  templateUrl: './positions-page.component.html',
  styleUrls: ['./positions-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionsPageComponent implements OnInit {
  readonly filterForm = this.fb.group({
    search: [''],
    status: [''],
    supplier: [''],
    type: ['']
  });

  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    retailObjectId: ['', Validators.required],
    positionType: ['', Validators.required],
    status: ['Available', Validators.required],
    supplierId: [''],
    widthCm: [100, [Validators.required, Validators.min(1)]],
    heightCm: [100, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  readonly editForm = this.fb.group({
    name: ['', Validators.required],
    retailObjectId: ['', Validators.required],
    positionType: ['', Validators.required],
    status: ['Available', Validators.required],
    supplierId: [''],
    widthCm: [100, [Validators.required, Validators.min(1)]],
    heightCm: [100, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  positions$!: Observable<Position[]>;
  readonly stores$ = this.storeService.getAll();
  readonly suppliers$ = this.supplierService.getAll();
  readonly positionTypes$ = this.positionService
    .getAll()
    .pipe(map((positions) => Array.from(new Set(positions.map((position) => position.positionType)))));
  readonly statusOptions: PositionStatus[] = ['Available', 'Reserved', 'Occupied', 'ExpiringSoon', 'Inactive'];
  editingPosition: Position | null = null;
  private stores: Store[] = [];
  private suppliers: Supplier[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly positionService: PositionService,
    private readonly notifications: NotificationService,
    private readonly reportExport: ReportExportService,
    private readonly storeService: StoreService,
    private readonly supplierService: SupplierService,
    private readonly layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    const filters$ = this.filterForm.valueChanges.pipe(startWith(this.filterForm.value));

    this.stores$.subscribe((stores) => {
      this.stores = stores;
      if (!this.createForm.value.retailObjectId && stores.length) {
        this.createForm.patchValue({ retailObjectId: stores[0].id });
      }
      if (!this.editForm.value.retailObjectId && stores.length) {
        this.editForm.patchValue({ retailObjectId: stores[0].id });
      }
    });

    this.suppliers$.subscribe((suppliers) => (this.suppliers = suppliers));

    this.positions$ = combineLatest([filters$, this.positionService.getAll(), this.stores$, this.suppliers$])
      .pipe(
        map(([filters, positions, stores, suppliers]) => {
          const storeLookup = new Map(stores.map((store) => [store.id, store]));
          const supplierLookup = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

          const normalized = positions.map((position) => {
            const store = storeLookup.get(position.retailObjectId);
            const supplier = position.supplierId ? supplierLookup.get(position.supplierId) : undefined;
            return {
              ...position,
              retailObjectName: store?.name ?? position.retailObjectName,
              supplier: supplier?.name ?? position.supplier
            } as Position;
          });

          return normalized.filter((position) => {
            const search = filters.search?.toLowerCase().trim();
            const supplierFilter = filters.supplier;
            const typeFilter = filters.type;
            const matchText = search
              ? position.name.toLowerCase().includes(search) ||
                position.retailObjectName.toLowerCase().includes(search) ||
                (position.supplier ?? '').toLowerCase().includes(search)
              : true;
            const matchStatus = filters.status ? position.status === filters.status : true;
            const matchSupplier = supplierFilter ? position.supplierId === supplierFilter : true;
            const matchType = typeFilter ? position.positionType === typeFilter : true;
            return matchText && matchStatus && matchSupplier && matchType;
          });
        }),
        // cache the filtered result so exports use the same dataset shown in the UI
        shareReplay(1)
      );
  }

  markInactive(position: Position): void {
    const updated: Position = { ...position, status: 'Inactive' };
    this.positionService.update(updated).subscribe(() => {
      this.notifications.push({ message: `${position.name} označeno kao neaktivno`, type: 'info' });
    });
  }

  addPosition(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.value;
    const store = this.stores.find((item) => item.id === value.retailObjectId);
    if (!store) {
      this.notifications.push({ message: 'Odaberite objekat iz liste', type: 'warning' });
      return;
    }

    const supplier = this.suppliers.find((item) => item.id === value.supplierId);

    this.positionService
      .create({
        name: value.name ?? '',
        retailObjectId: store.id,
        retailObjectName: store.name,
        positionType: value.positionType ?? '',
        status: (value.status as PositionStatus) ?? 'Available',
        supplierId: supplier?.id,
        supplier: supplier?.name || undefined,
        widthCm: Number(value.widthCm ?? 0),
        heightCm: Number(value.heightCm ?? 0),
        note: value.note || undefined
      })
      .pipe(
        switchMap((created) =>
          this.layoutService.syncPositionOnLayout(created).pipe(map(() => created))
        )
      )
      .subscribe(() => {
        this.notifications.push({ message: 'Nova pozicija dodana', type: 'success' });
        this.createForm.reset({
          name: '',
          retailObjectId: store.id,
          positionType: '',
          status: 'Available',
          supplierId: '',
          widthCm: 100,
          heightCm: 100,
          note: ''
        });
      });
  }

  startEdit(position: Position): void {
    this.editingPosition = position;
    this.editForm.patchValue({
      name: position.name,
      retailObjectId: position.retailObjectId,
      positionType: position.positionType,
      status: position.status,
      supplierId: position.supplierId ?? '',
      widthCm: position.widthCm,
      heightCm: position.heightCm,
      note: position.note ?? ''
    });
  }

  cancelEdit(): void {
    this.editingPosition = null;
    this.editForm.reset({
      name: '',
      retailObjectId: '',
      positionType: '',
      status: 'Available',
      supplierId: '',
      widthCm: 100,
      heightCm: 100,
      note: ''
    });
  }

  saveEdit(): void {
    if (!this.editingPosition) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.value;
    const updated: Position = {
      ...this.editingPosition,
      name: value.name ?? '',
      retailObjectId: value.retailObjectId ?? '',
      retailObjectName: this.stores.find((store) => store.id === value.retailObjectId)?.name ?? '',
      positionType: value.positionType ?? '',
      status: (value.status as PositionStatus) ?? 'Available',
      supplierId: value.supplierId || undefined,
      supplier: this.suppliers.find((supplier) => supplier.id === value.supplierId)?.name || undefined,
      widthCm: Number(value.widthCm ?? 0),
      heightCm: Number(value.heightCm ?? 0),
      note: value.note || undefined
    };

    this.positionService
      .update(updated)
      .pipe(switchMap((position) => this.layoutService.syncPositionOnLayout(position).pipe(map(() => position))))
      .subscribe(() => {
        this.notifications.push({ message: `${updated.name} ažurirano`, type: 'success' });
        this.cancelEdit();
      });
  }

  exportReport(): void {
    combineLatest([this.positions$, this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))])
      .pipe(take(1))
      .subscribe(([positions, filters]) => {
        this.reportExport.exportToXlsx({
          data: positions,
          fileName: 'pozicije-izvjestaj',
          worksheetName: 'Pozicije',
          criteria: {
            Pretraga: filters.search || undefined,
            Status: filters.status || undefined,
            Dobavljač: filters.supplier
              ? this.suppliers.find((supplier) => supplier.id === filters.supplier)?.name ?? filters.supplier
              : undefined,
            Tip: filters.type || undefined
          },
          mapRow: (position) => ({
            Naziv: position.name,
            Objekat: position.retailObjectName,
            Tip: position.positionType,
            Status: position.status,
            Dobavljač: position.supplier ?? '—',
            Širina: `${position.widthCm} cm`,
            Visina: `${position.heightCm} cm`,
            Površina: `${position.widthCm * position.heightCm} cm²`,
            Napomena: position.note ?? '—'
          })
        });
        this.notifications.push({ message: 'XLSX izvještaj generisan', type: 'success' });
      });
  }
}
