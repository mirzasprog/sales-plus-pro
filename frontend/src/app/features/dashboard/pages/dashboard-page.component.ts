import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

interface DashboardSummary {
  totalPositions: number;
  available: number;
  occupied: number;
  expiringSoon: number;
  inactive: number;
  revenueYtd: number;
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  summary$!: Observable<DashboardSummary>;
  chartData$!: Observable<{ name: string; value: number }[]>;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.summary$ = this.api.get<DashboardSummary>('dashboard/summary');
    this.chartData$ = this.summary$.pipe(
      map((summary) => [
        { name: 'Slobodno', value: summary.available },
        { name: 'Zauzeto', value: summary.occupied },
        { name: 'Ističe', value: summary.expiringSoon },
        { name: 'Neaktivno', value: summary.inactive }
      ])
    );
  }
}
