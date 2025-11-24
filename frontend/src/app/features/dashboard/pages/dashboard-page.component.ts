import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, shareReplay, startWith, switchMap } from 'rxjs';
import { PositionService } from '../../../core/services/position.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { StoreService } from '../../../core/services/store.service';
import { ContractService } from '../../../core/services/contract.service';
import { PositionStatus } from '../../../shared/models/position-status';
import { Supplier } from '../../../shared/models/supplier.model';
import { Store } from '../../../shared/models/store.model';
import { Position } from '../../../shared/models/position.model';
import { Contract } from '../../../shared/models/contract.model';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { DashboardSummary, ExpiringContract } from '../../../shared/models/dashboard-summary.model';

interface DashboardFiltersForm {
  region: string | null;
  store: string | null;
  supplier: string | null;
  positionType: string | null;
}

interface DashboardFilters extends DashboardFiltersForm {
  region: string | null;
  store: string | null;
  supplier: string | null;
  positionType: string | null;
}

interface DashboardTrendPoint {
  name: string;
  series: { name: string; value: number }[];
}

interface StoreCoverage {
  id: string;
  name: string;
  city: string;
  occupancy: number;
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  summary$!: Observable<DashboardSummary>;
  expiringContracts$!: Observable<ExpiringContract[]>;
  topSuppliers$!: Observable<Supplier[]>;
  storeCoverage$!: Observable<StoreCoverage[]>;
  trend$!: Observable<DashboardTrendPoint[]>;
  filterOptions$!: Observable<{
    regions: string[];
    stores: Store[];
    suppliers: Supplier[];
    positionTypes: string[];
  }>;
  filtersForm!: FormGroup;

  private readonly filters$ = new BehaviorSubject<DashboardFilters>({
    region: null,
    store: null,
    supplier: null,
    positionType: null
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly positionService: PositionService,
    private readonly supplierService: SupplierService,
    private readonly storeService: StoreService,
    private readonly contractService: ContractService,
    private readonly analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.filtersForm = this.fb.group({
      region: [null],
      store: [null],
      supplier: [null],
      positionType: [null]
    });

    this.filtersForm.valueChanges
      .pipe(startWith(this.filtersForm.value as DashboardFiltersForm))
      .subscribe((value) => this.filters$.next(value));

    const filterParams$ = this.filters$.pipe(map((filters) => this.buildFilterParams(filters)));

    const stores$ = filterParams$.pipe(switchMap((params) => this.storeService.getAll(params)));
    const suppliers$ = filterParams$.pipe(switchMap((params) => this.supplierService.getAll(params)));
    const positions$ = combineLatest([this.positionService.getAll(), stores$, this.filters$]).pipe(
      map(([positions, stores, filters]) => {
        const storeLookup = new Map(stores.map((store) => [store.id, store]));
        return positions
          .map((position) => ({
            ...position,
            retailObjectName: storeLookup.get(position.retailObjectId)?.name ?? position.retailObjectName
          }))
          .filter((position) => this.positionMatchesFilters(position, storeLookup, filters));
      }),
      shareReplay(1)
    );
    const contracts$ = combineLatest([this.contractService.getAll(), positions$, stores$, this.filters$]).pipe(
      map(([contracts, positions, stores, filters]) => {
        const storeLookup = new Map(stores.map((store) => [store.id, store]));
        return contracts.filter((contract) => {
          const position = positions.find((item) => item.id === contract.positionId);
          const store = position ? storeLookup.get(position.retailObjectId) : undefined;
          const matchesRegion = filters.region ? store?.city === filters.region : true;
          const matchesStore = filters.store ? position?.retailObjectId === filters.store : true;
          const matchesSupplier = filters.supplier ? contract.supplierId === filters.supplier : true;
          return matchesRegion && matchesStore && matchesSupplier;
        });
      }),
      shareReplay(1)
    );

    this.filterOptions$ = combineLatest([positions$, suppliers$, stores$]).pipe(
      map(([positions, suppliers, stores]) => ({
        regions: Array.from(new Set(stores.map((store) => store.city))),
        stores,
        suppliers,
        positionTypes: Array.from(new Set(positions.map((position) => position.positionType)))
      }))
    );

    this.summary$ = filterParams$.pipe(switchMap((params) => this.analyticsService.getSummary(params)));

    this.expiringContracts$ = this.summary$.pipe(map((summary) => summary.expiringContractsList));

    this.topSuppliers$ = this.summary$.pipe(map((summary) => summary.topSuppliers));

    this.storeCoverage$ = stores$.pipe(
      map((storeMetrics) =>
        storeMetrics
          .map((store) => ({
            id: store.id,
            name: store.name,
            city: store.city,
            occupancy: store.totalPositions ? Math.round((store.occupied / store.totalPositions) * 100) : 0
          }))
          .slice(0, 4)
      )
    );

    this.trend$ = combineLatest([positions$, contracts$]).pipe(map(([positions, contracts]) => this.buildTrends(positions, contracts)));
  }

  private buildFilterParams(filters: DashboardFilters): Record<string, string> {
    return {
      region: filters.region ?? '',
      storeId: filters.store ?? '',
      supplierId: filters.supplier ?? '',
      positionType: filters.positionType ?? ''
    };
  }

  private positionMatchesFilters(position: Position, storeLookup: Map<string, Store>, filters: DashboardFilters): boolean {
    const store = storeLookup.get(position.retailObjectId);
    const matchesRegion = filters.region ? store?.city === filters.region : true;
    const matchesStore = filters.store ? position.retailObjectId === filters.store : true;
    const matchesSupplier = filters.supplier ? position.supplierId === filters.supplier : true;
    const matchesType = filters.positionType ? position.positionType === filters.positionType : true;
    return matchesRegion && matchesStore && matchesSupplier && matchesType;
  }

  private isExpiringSoon(date: string, thresholdDays: number): boolean {
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= thresholdDays;
  }

  onSelectFilter(control: keyof DashboardFiltersForm, value: string | null): void {
    this.filtersForm.patchValue({ [control]: value } as Partial<DashboardFiltersForm>);
  }

  private buildStoreCoverage(positions: Position[], storeLookup: Map<string, Store>): StoreCoverage[] {
    const grouped = positions.reduce<Map<string, { id: string; name: string; city: string; total: number; occupied: number }>>(
      (acc, position) => {
        const store = storeLookup.get(position.retailObjectId);
        const entry =
          acc.get(position.retailObjectId) ||
          ({
            id: position.retailObjectId,
            name: store?.name ?? position.retailObjectName,
            city: store?.city ?? '',
            total: 0,
            occupied: 0
          } as { id: string; name: string; city: string; total: number; occupied: number });

        entry.total += 1;
        entry.occupied += position.status === 'Occupied' ? 1 : 0;
        acc.set(position.retailObjectId, entry);
        return acc;
      },
      new Map()
    );

    return Array.from(grouped.values()).map((store) => ({
      id: store.id,
      name: store.name,
      city: store.city,
      occupancy: store.total ? Math.round((store.occupied / store.total) * 100) : 0
    }));
  }

  private buildTrends(positions: Position[], contracts: Contract[]): DashboardTrendPoint[] {
    const monthsBack = 6;
    const today = new Date();
    const buckets: { label: string; start: Date; end: Date }[] = [];

    for (let i = monthsBack - 1; i >= 0; i -= 1) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      buckets.push({
        label: start.toLocaleString('default', { month: 'short' }),
        start,
        end
      });
    }

    const totalPositions = positions.length || 1;

    const occupancySeries = buckets.map((bucket) => {
      const activeContracts = contracts.filter((contract) => {
        const startDate = new Date(contract.startDate);
        const endDate = new Date(contract.endDate);
        return startDate <= bucket.end && endDate >= bucket.start;
      }).length;

      const occupancyRate = Math.min(100, Math.round((activeContracts / totalPositions) * 100));
      return { name: bucket.label, value: occupancyRate };
    });

    const revenueSeries = buckets.map((bucket) => {
      const monthlyRevenue = contracts.reduce((sum, contract) => {
        const startDate = new Date(contract.startDate);
        const endDate = new Date(contract.endDate);
        const overlaps = startDate <= bucket.end && endDate >= bucket.start;
        if (!overlaps) {
          return sum;
        }

        const months = this.monthDiff(startDate, endDate) || 1;
        return sum + contract.value / months;
      }, 0);

      return { name: bucket.label, value: Math.round(monthlyRevenue) };
    });

    return [
      { name: 'Zauzetost', series: occupancySeries },
      { name: 'Prihod', series: revenueSeries }
    ];
  }

  private monthDiff(startDate: Date, endDate: Date): number {
    return Math.max(1, endDate.getMonth() - startDate.getMonth() + 12 * (endDate.getFullYear() - startDate.getFullYear()) + 1);
  }
}
