import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { SupplierService } from '../../../core/services/supplier.service';
import { NotificationService } from '../../../core/services/notification.service';
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

  constructor(
    private readonly fb: FormBuilder,
    private readonly supplierService: SupplierService,
    private readonly notifications: NotificationService
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
}
