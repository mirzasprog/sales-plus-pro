import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PositionStatus } from '../../../shared/models/position-status';

interface Position {
  id: string;
  name: string;
  positionType: string;
  status: PositionStatus;
  retailObjectName: string;
}

@Component({
  selector: 'app-positions-page',
  templateUrl: './positions-page.component.html',
  styleUrls: ['./positions-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionsPageComponent implements OnInit {
  readonly filterForm = this.fb.group({
    search: ['']
  });

  positions$!: Observable<Position[]>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    const search$ = this.filterForm.controls.search.valueChanges.pipe(startWith(''));
    this.positions$ = search$.pipe(
      switchMap((search) =>
        this.api.get<Position[]>('additionalpositions').pipe(
          map((positions) =>
            positions.filter((position) =>
              search
                ? position.name.toLowerCase().includes(search.toLowerCase()) ||
                  position.retailObjectName.toLowerCase().includes(search.toLowerCase())
                : true
            )
          )
        )
      )
    );
  }

  markInactive(position: Position): void {
    this.notifications.push({ message: `${position.name} označeno kao neaktivno`, type: 'info' });
  }
}
