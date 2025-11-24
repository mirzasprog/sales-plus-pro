import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, take } from 'rxjs/operators';
import { SupplierService } from '../../../core/services/supplier.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportExportService } from '../../../core/services/report-export.service';
import { Supplier } from '../../../shared/models/supplier.model';

@Component({
  selector: 'app-supplier-list-page',
  templateUrl: './supplier-list-page.component.html',
  styleUrls: ['./supplier-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierListPageComponent implements OnInit {
  readonly filterForm = this.fb.group({
    search: [''],
    category: [''],
    selectedSuppliers: [[] as string[]],
    expiryFrom: [''],
    expiryTo: [''],
    minRevenue: [''],
    maxRevenue: ['']
  });

  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    activeContracts: [0, [Validators.required, Validators.min(0)]],
    activeStores: [0, [Validators.required, Validators.min(0)]],
    activePositions: [0, [Validators.required, Validators.min(0)]],
    activeRevenue: [0, [Validators.required, Validators.min(0)]],
    nextExpiry: ['']
  });

  readonly allSuppliers$ = this.supplierService.getAll();
  suppliers$!: Observable<Supplier[]>;
  editingSupplier: Supplier | null = null;
  readonly editForm = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    activeContracts: [0, [Validators.required, Validators.min(0)]],
    activeStores: [0, [Validators.required, Validators.min(0)]],
    activePositions: [0, [Validators.required, Validators.min(0)]],
    activeRevenue: [0, [Validators.required, Validators.min(0)]],
    nextExpiry: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly supplierService: SupplierService,
    private readonly notifications: NotificationService,
    private readonly reportExport: ReportExportService
  ) {}

  ngOnInit(): void {
    const filters$ = this.filterForm.valueChanges.pipe(startWith(this.filterForm.value));
    this.suppliers$ = combineLatest([this.allSuppliers$, filters$]).pipe(
      map(([suppliers, filters]) =>
        suppliers.filter((supplier) => {
          const matchSearch = supplier.name
            .toLowerCase()
            .includes((filters.search ?? '').toLowerCase());
          const matchCategory = filters.category
            ? supplier.category.toLowerCase().includes(filters.category.toLowerCase())
            : true;
          const matchSelection = (filters.selectedSuppliers?.length ?? 0) > 0
            ? (filters.selectedSuppliers as string[]).includes(supplier.id)
            : true;

          const expiryDate = supplier.nextExpiry ? new Date(supplier.nextExpiry) : null;
          const matchExpiryFrom = filters.expiryFrom
            ? expiryDate !== null && expiryDate >= new Date(filters.expiryFrom)
            : true;
          const matchExpiryTo = filters.expiryTo
            ? expiryDate !== null && expiryDate <= new Date(filters.expiryTo)
            : true;

          const minRevenue = filters.minRevenue ? Number(filters.minRevenue) : null;
          const maxRevenue = filters.maxRevenue ? Number(filters.maxRevenue) : null;
          const matchMinRevenue = minRevenue !== null ? supplier.activeRevenue >= minRevenue : true;
          const matchMaxRevenue = maxRevenue !== null ? supplier.activeRevenue <= maxRevenue : true;

          return (
            matchSearch &&
            matchCategory &&
            matchSelection &&
            matchExpiryFrom &&
            matchExpiryTo &&
            matchMinRevenue &&
            matchMaxRevenue
          );
        })
      )
    );
  }

  addSupplier(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.value;
    this.supplierService
      .create({
        name: value.name ?? '',
        category: value.category ?? '',
        activeContracts: Number(value.activeContracts ?? 0),
        activeStores: Number(value.activeStores ?? 0),
        activePositions: Number(value.activePositions ?? 0),
        activeRevenue: Number(value.activeRevenue ?? 0),
        nextExpiry: value.nextExpiry || undefined
      })
      .subscribe(() => {
        this.notifications.push({ message: 'Novi dobavljač dodan', type: 'success' });
        this.createForm.reset({
          name: '',
          category: '',
          activeContracts: 0,
          activeStores: 0,
          activePositions: 0,
          activeRevenue: 0,
          nextExpiry: ''
        });
      });
  }

  startEdit(supplier: Supplier): void {
    this.editingSupplier = supplier;
    this.editForm.patchValue({
      name: supplier.name,
      category: supplier.category,
      activeContracts: supplier.activeContracts,
      activeStores: supplier.activeStores,
      activePositions: supplier.activePositions,
      activeRevenue: supplier.activeRevenue,
      nextExpiry: supplier.nextExpiry ?? ''
    });
  }

  cancelEdit(): void {
    this.editingSupplier = null;
    this.editForm.reset({
      name: '',
      category: '',
      activeContracts: 0,
      activeStores: 0,
      activePositions: 0,
      activeRevenue: 0,
      nextExpiry: ''
    });
  }

  saveEdit(): void {
    if (!this.editingSupplier) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.value;
    const updated: Supplier = {
      ...this.editingSupplier,
      name: value.name ?? '',
      category: value.category ?? '',
      activeContracts: Number(value.activeContracts ?? 0),
      activeStores: Number(value.activeStores ?? 0),
      activePositions: Number(value.activePositions ?? 0),
      activeRevenue: Number(value.activeRevenue ?? 0),
      nextExpiry: value.nextExpiry || undefined
    };

    this.supplierService.update(updated).subscribe(() => {
      this.notifications.push({ message: `${updated.name} ažuriran`, type: 'success' });
      this.cancelEdit();
    });
  }

  exportReport(): void {
    combineLatest([this.suppliers$, this.allSuppliers$])
      .pipe(take(1))
      .subscribe(([suppliers, allSuppliers]) => {
        const filters = this.filterForm.value;
        const supplierNamesMap = new Map<string, string>(
          allSuppliers.map((supplier) => [supplier.id, supplier.name])
        );

        this.reportExport.exportToXlsx({
          data: suppliers,
          fileName: 'dobavljaci-izvjestaj',
          worksheetName: 'Dobavljači',
          criteria: {
            Pretraga: filters.search || undefined,
            Kategorija: filters.category || undefined,
            Dobavljači:
              filters.selectedSuppliers && filters.selectedSuppliers.length > 0
                ? (filters.selectedSuppliers as string[])
                    .map((id) => supplierNamesMap.get(id) ?? id)
                    .join(', ')
                : undefined,
            'Istek od': filters.expiryFrom || undefined,
            'Istek do': filters.expiryTo || undefined,
            'Minimalni prihod': filters.minRevenue || undefined,
            'Maksimalni prihod': filters.maxRevenue || undefined
          },
          mapRow: (supplier) => ({
            Naziv: supplier.name,
            Kategorija: supplier.category,
            'Aktivni ugovori': supplier.activeContracts,
            'Aktivni objekti': supplier.activeStores,
            'Aktivne pozicije': supplier.activePositions,
            Prihod: supplier.activeRevenue,
            'Sljedeći isteka': supplier.nextExpiry ?? '—'
          })
        });
        this.notifications.push({ message: 'XLSX izvještaj za dobavljače generisan', type: 'success' });
      });
  }
}
