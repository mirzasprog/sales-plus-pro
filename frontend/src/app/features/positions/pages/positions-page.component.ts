import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { PositionService } from '../../../core/services/position.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PositionStatus } from '../../../shared/models/position-status';
import { Position } from '../../../shared/models/position.model';

@Component({
  selector: 'app-positions-page',
  templateUrl: './positions-page.component.html',
  styleUrls: ['./positions-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionsPageComponent implements OnInit {
  readonly filterForm = this.fb.group({
    search: [''],
    status: [''],
    supplier: [''],
    type: ['']
  });

  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    retailObjectName: ['', Validators.required],
    positionType: ['', Validators.required],
    status: ['Available', Validators.required],
    supplier: [''],
    widthCm: [100, [Validators.required, Validators.min(1)]],
    heightCm: [100, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  positions$!: Observable<Position[]>;
  readonly statusOptions: PositionStatus[] = ['Available', 'Reserved', 'Occupied', 'ExpiringSoon', 'Inactive'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly positionService: PositionService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    const filters$ = this.filterForm.valueChanges.pipe(startWith(this.filterForm.value));
    this.positions$ = filters$.pipe(
      switchMap((filters) =>
        this.positionService.getAll().pipe(
          map((positions) =>
            positions.filter((position) => {
              const matchText = filters.search
                ? position.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                  position.retailObjectName.toLowerCase().includes(filters.search.toLowerCase())
                : true;
              const matchStatus = filters.status ? position.status === filters.status : true;
              const matchSupplier = filters.supplier
                ? (position.supplier ?? '').toLowerCase().includes(filters.supplier.toLowerCase())
                : true;
              const matchType = filters.type ? position.positionType === filters.type : true;
              return matchText && matchStatus && matchSupplier && matchType;
            })
          )
        )
      )
    );
  }

  markInactive(position: Position): void {
    this.notifications.push({ message: `${position.name} označeno kao neaktivno`, type: 'info' });
  }

  addPosition(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.value;
    this.positionService
      .create({
        name: value.name ?? '',
        retailObjectName: value.retailObjectName ?? '',
        positionType: value.positionType ?? '',
        status: (value.status as PositionStatus) ?? 'Available',
        supplier: value.supplier || undefined,
        widthCm: Number(value.widthCm ?? 0),
        heightCm: Number(value.heightCm ?? 0),
        note: value.note || undefined
      })
      .subscribe(() => {
        this.notifications.push({ message: 'Nova pozicija dodana', type: 'success' });
        this.createForm.reset({
          name: '',
          retailObjectName: '',
          positionType: '',
          status: 'Available',
          supplier: '',
          widthCm: 100,
          heightCm: 100,
          note: ''
        });
      });
  }
}
