import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { PositionService } from '../../../core/services/position.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { StoreService } from '../../../core/services/store.service';
import { ContractService } from '../../../core/services/contract.service';
import { PositionStatus } from '../../../shared/models/position-status';
import { Supplier } from '../../../shared/models/supplier.model';
import { Store } from '../../../shared/models/store.model';
import { Position } from '../../../shared/models/position.model';

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
  storeCoverage$!: Observable<Store[]>;

  constructor(
    private readonly positionService: PositionService,
    private readonly supplierService: SupplierService,
    private readonly storeService: StoreService,
    private readonly contractService: ContractService
  ) {}

  ngOnInit(): void {
    const positions$ = this.positionService.getAll();
    const contracts$ = this.contractService.getAll();
    const suppliers$ = this.supplierService.getAll();
    const stores$ = this.storeService.getAll();

    this.summary$ = combineLatest([positions$, contracts$, stores$]).pipe(
      map(([positions, contracts, stores]) => {
        const totalPositions = positions.length;
        const statusCount = (status: PositionStatus) => positions.filter((p) => p.status === status).length;
        const expiringContracts = contracts.filter((contract) => this.isExpiringSoon(contract.endDate, 30)).length;
        const occupied = statusCount('Occupied');
        const coverage = stores.length
          ? Math.round((stores.reduce((acc, s) => acc + s.occupied, 0) / stores.reduce((acc, s) => acc + s.totalPositions, 0)) * 100)
          : 0;

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

    this.expiringContracts$ = contracts$.pipe(
      map((contracts) =>
        contracts
          .filter((contract) => this.isExpiringSoon(contract.endDate, 45))
          .map((contract) => ({ supplier: contract.supplierId, endDate: contract.endDate, value: contract.value }))
      )
    );

    this.topSuppliers$ = suppliers$.pipe(
      map((suppliers) => [...suppliers].sort((a, b) => b.activeRevenue - a.activeRevenue).slice(0, 5))
    );

    this.storeCoverage$ = stores$.pipe(map((stores) => stores.slice(0, 4)));
  }

  private isExpiringSoon(date: string, thresholdDays: number): boolean {
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= thresholdDays;
  }
}
