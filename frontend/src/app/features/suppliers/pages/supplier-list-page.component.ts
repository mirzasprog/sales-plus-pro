import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, switchMap, take } from 'rxjs/operators';
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
    category: ['']
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
    this.suppliers$ = filters$.pipe(
      switchMap((filters) =>
        this.supplierService.getAll().pipe(
          map((suppliers) =>
            suppliers.filter((supplier) =>
              supplier.name.toLowerCase().includes((filters.search ?? '').toLowerCase()) &&
              (filters.category ? supplier.category.toLowerCase().includes(filters.category.toLowerCase()) : true)
            )
          )
        )
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
    this.suppliers$.pipe(take(1)).subscribe((suppliers) => {
      const filters = this.filterForm.value;
      this.reportExport.exportToXlsx({
        data: suppliers,
        fileName: 'dobavljaci-izvjestaj',
        worksheetName: 'Dobavljači',
        criteria: {
          Pretraga: filters.search || undefined,
          Kategorija: filters.category || undefined
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
