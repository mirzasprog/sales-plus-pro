import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Contract } from '../../shared/models/contract.model';

interface BrandLeaseDto {
  id: string;
  additionalPositionId: string;
  brandId: string;
  brandName: string;
  startDate: string;
  endDate: string;
  price: number;
  status: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor(private readonly api: ApiService) {}

  getAll(): Observable<Contract[]> {
    return this.api.get<BrandLeaseDto[]>('brandleases').pipe(
      // reuse the existing UI contract model
      map((leases) =>
        leases.map(
          (lease) =>
            ({
              id: lease.id,
              supplierId: lease.brandId,
              supplier: lease.brandName,
              positionId: lease.additionalPositionId,
              storeId: '',
              startDate: lease.startDate,
              endDate: lease.endDate,
              value: lease.price
            } as Contract)
        )
      )
    );
  }
}
