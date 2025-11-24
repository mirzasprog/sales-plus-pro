import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Position } from '../../shared/models/position.model';

interface AdditionalPositionDto {
  id: string;
  retailObjectId: string;
  retailObjectName: string;
  name: string;
  positionType: string;
  width: number;
  height: number;
  status: string;
  activeLeases: number;
  leaseStart?: string | null;
  leaseEnd?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PositionService {
  constructor(private readonly api: ApiService) {}

  getAll(): Observable<Position[]> {
    return this.api
      .get<AdditionalPositionDto[]>('additionalpositions')
      .pipe(map((items) => items.map((item) => this.mapPosition(item))));
  }

  getById(id: string): Observable<Position> {
    return this.api.get<AdditionalPositionDto>(`additionalpositions/${id}`).pipe(map((item) => this.mapPosition(item)));
  }

  create(payload: Omit<Position, 'id'>): Observable<Position> {
    return this.api
      .post<AdditionalPositionDto>('additionalpositions', {
        retailObjectId: payload.retailObjectId,
        name: payload.name,
        positionType: payload.positionType,
        width: payload.widthCm,
        height: payload.heightCm
      })
      .pipe(map((item) => this.mapPosition(item)));
  }

  update(position: Position): Observable<Position> {
    return this.api
      .put<AdditionalPositionDto>(`additionalpositions/${position.id}`, {
        id: position.id,
        retailObjectId: position.retailObjectId,
        name: position.name,
        positionType: position.positionType,
        width: position.widthCm,
        height: position.heightCm,
        status: position.status
      })
      .pipe(map((item) => this.mapPosition(item)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`additionalpositions/${id}`);
  }

  private mapPosition(dto: AdditionalPositionDto): Position {
    return {
      id: dto.id,
      name: dto.name,
      positionType: dto.positionType,
      status: dto.status as Position['status'],
      retailObjectId: dto.retailObjectId,
      retailObjectName: dto.retailObjectName,
      supplierId: dto.supplierId ?? undefined,
      supplier: dto.supplierName ?? undefined,
      widthCm: dto.width,
      heightCm: dto.height,
      note: undefined,
      leaseStart: dto.leaseStart ?? undefined,
      leaseEnd: dto.leaseEnd ?? undefined,
      activeLeases: dto.activeLeases
    };
  }
}
