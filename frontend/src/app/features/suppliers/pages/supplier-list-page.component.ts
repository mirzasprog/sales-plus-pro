import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

interface SupplierMetrics {
  id: string;
  name: string;
  category: string;
  activeContracts: number;
  activeStores: number;
  activePositions: number;
  activeRevenue: number;
  nextExpiry?: string;
}

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

  suppliers$!: Observable<SupplierMetrics[]>;

  constructor(private readonly fb: FormBuilder, private readonly api: ApiService) {}

  ngOnInit(): void {
    const filters$ = this.filterForm.valueChanges.pipe(startWith(this.filterForm.value));
    this.suppliers$ = filters$.pipe(
      switchMap((filters) => this.api.get<SupplierMetrics[]>('dashboard/suppliers').pipe(
        map((suppliers) =>
          suppliers.filter((supplier) =>
            supplier.name.toLowerCase().includes((filters.search ?? '').toLowerCase()) &&
            (filters.category ? supplier.category.toLowerCase().includes(filters.category.toLowerCase()) : true)
          )
        )
      ))
    );
  }
}
