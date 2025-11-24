import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, shareReplay, startWith } from 'rxjs';
import { PositionService } from '../../../core/services/position.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { StoreService } from '../../../core/services/store.service';
import { ContractService } from '../../../core/services/contract.service';
import { PositionStatus } from '../../../shared/models/position-status';
import { Supplier } from '../../../shared/models/supplier.model';
import { Store } from '../../../shared/models/store.model';
import { Position } from '../../../shared/models/position.model';
import { Contract } from '../../../shared/models/contract.model';

interface DashboardSummary {
  totalPositions: number;
  available: number;
  occupied: number;
  reserved: number;
  expiringSoon: number;
  inactive: number;
  expiringContracts: number;
  coverage: number;
}

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
  expiringContracts$!: Observable<{ supplier: string; endDate: string; value: number }[]>;
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
    private readonly contractService: ContractService
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

    const positions$ = this.positionService.getAll();
    const contracts$ = this.contractService.getAll();
    const suppliers$ = this.supplierService.getAll();
    const stores$ = this.storeService.getAll();

    this.filterOptions$ = combineLatest([positions$, suppliers$, stores$]).pipe(
      map(([positions, suppliers, stores]) => ({
        regions: Array.from(new Set(stores.map((store) => store.city))),
        stores,
        suppliers,
        positionTypes: Array.from(new Set(positions.map((position) => position.positionType)))
      }))
    );

    const dashboardState$ = combineLatest([positions$, contracts$, stores$, suppliers$, this.filters$]).pipe(
      map(([positions, contracts, stores, suppliers, filters]) => {
        const storeLookup = new Map(stores.map((store) => [store.id, store]));
        const supplierLookup = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

        const normalizedPositions = positions.map((position) => {
          const store = storeLookup.get(position.retailObjectId);
          const supplier = position.supplierId ? supplierLookup.get(position.supplierId) : undefined;
          return {
            ...position,
            retailObjectName: store?.name ?? position.retailObjectName,
            supplier: supplier?.name ?? position.supplier
          } as Position;
        });

        const positionMatchesFilters = (position: Position): boolean => {
          const store = storeLookup.get(position.retailObjectId);
          const matchesRegion = filters.region ? store?.city === filters.region : true;
          const matchesStore = filters.store ? position.retailObjectId === filters.store : true;
          const matchesSupplier = filters.supplier ? position.supplierId === filters.supplier : true;
          const matchesType = filters.positionType ? position.positionType === filters.positionType : true;
          return matchesRegion && matchesStore && matchesSupplier && matchesType;
        };

        const filteredPositions = normalizedPositions.filter(positionMatchesFilters);

        const filteredContracts = contracts.filter((contract) => {
          const contractPosition = normalizedPositions.find((p) => p.id === contract.positionId);
          const contractStore = storeLookup.get(contract.storeId);
          const matchesRegion = filters.region ? contractStore?.city === filters.region : true;
          const matchesStore = filters.store ? contract.storeId === filters.store : true;
          const matchesSupplier = filters.supplier ? contract.supplierId === filters.supplier : true;
          const matchesPosition = contractPosition ? positionMatchesFilters(contractPosition) : true;
          return matchesRegion && matchesStore && matchesSupplier && matchesPosition;
        });

        const filteredStores = stores.filter((store) => {
          const matchesRegion = filters.region ? store.city === filters.region : true;
          const matchesStore = filters.store ? store.id === filters.store : true;
          return matchesRegion && matchesStore;
        });

        const storeCoverage = this.buildStoreCoverage(filteredPositions, storeLookup);

        return {
          filters,
          positions: filteredPositions,
          contracts: filteredContracts,
          stores: filteredStores,
          suppliers,
          storeCoverage
        };
      }),
      shareReplay(1)
    );

    this.summary$ = dashboardState$.pipe(
      map(({ positions, contracts }) => {
        const totalPositions = positions.length;
        const statusCount = (status: PositionStatus) => positions.filter((p) => p.status === status).length;
        const expiringContracts = contracts.filter((contract) => this.isExpiringSoon(contract.endDate, 30)).length;
        const occupied = statusCount('Occupied');
        const coverage = totalPositions ? Math.round((occupied / totalPositions) * 100) : 0;

        return {
          totalPositions,
          available: statusCount('Available'),
          occupied,
          reserved: statusCount('Reserved'),
          expiringSoon: statusCount('ExpiringSoon'),
          inactive: statusCount('Inactive'),
          expiringContracts,
          coverage
        };
      })
    );

    this.expiringContracts$ = dashboardState$.pipe(
      map(({ contracts, suppliers }) =>
        contracts
          .filter((contract) => this.isExpiringSoon(contract.endDate, 45))
          .map((contract) => ({
            supplier: suppliers.find((supplier) => supplier.id === contract.supplierId)?.name ?? contract.supplierId,
            endDate: contract.endDate,
            value: contract.value
          }))
      )
    );

    this.topSuppliers$ = dashboardState$.pipe(
      map(({ suppliers, contracts, positions, filters }) => {
        const supplierIds = filters.supplier ? [filters.supplier] : suppliers.map((s) => s.id);
        const supplierTotals = supplierIds.map((id) => {
          const supplier = suppliers.find((s) => s.id === id)!;
          const supplierContracts = contracts.filter((contract) => contract.supplierId === id);
          const revenue = supplierContracts.reduce((total, contract) => total + contract.value, 0);
          const activePositions = positions.filter((position) => position.supplierId === id).length;
          const activeStores = new Set(
            positions.filter((position) => position.supplierId === id).map((position) => position.retailObjectId)
          ).size;
          return {
            ...supplier,
            activeRevenue: revenue,
            activePositions,
            activeContracts: supplierContracts.length,
            activeStores
          };
        });

        return [...supplierTotals].sort((a, b) => b.activeRevenue - a.activeRevenue).slice(0, 5);
      })
    );

    this.storeCoverage$ = dashboardState$.pipe(
      map(({ storeCoverage }) => storeCoverage.slice(0, 4))
    );

    this.trend$ = dashboardState$.pipe(map((state) => this.buildTrends(state.positions, state.contracts)));
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
