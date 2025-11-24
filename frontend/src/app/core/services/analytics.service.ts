import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardSummary } from '../../shared/models/dashboard-summary.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private readonly api: ApiService) {}

  getSummary(params?: Record<string, unknown>): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('dashboard/summary', params);
  }
}
