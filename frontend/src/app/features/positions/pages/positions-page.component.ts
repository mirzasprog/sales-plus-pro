import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith, switchMap, take } from 'rxjs/operators';
import { PositionService } from '../../../core/services/position.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportExportService } from '../../../core/services/report-export.service';
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

  readonly editForm = this.fb.group({
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
  editingPosition: Position | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly positionService: PositionService,
    private readonly notifications: NotificationService,
    private readonly reportExport: ReportExportService
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
    const updated: Position = { ...position, status: 'Inactive' };
    this.positionService.update(updated).subscribe(() => {
      this.notifications.push({ message: `${position.name} označeno kao neaktivno`, type: 'info' });
    });
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

  startEdit(position: Position): void {
    this.editingPosition = position;
    this.editForm.patchValue({
      name: position.name,
      retailObjectName: position.retailObjectName,
      positionType: position.positionType,
      status: position.status,
      supplier: position.supplier ?? '',
      widthCm: position.widthCm,
      heightCm: position.heightCm,
      note: position.note ?? ''
    });
  }

  cancelEdit(): void {
    this.editingPosition = null;
    this.editForm.reset({
      name: '',
      retailObjectName: '',
      positionType: '',
      status: 'Available',
      supplier: '',
      widthCm: 100,
      heightCm: 100,
      note: ''
    });
  }

  saveEdit(): void {
    if (!this.editingPosition) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.value;
    const updated: Position = {
      ...this.editingPosition,
      name: value.name ?? '',
      retailObjectName: value.retailObjectName ?? '',
      positionType: value.positionType ?? '',
      status: (value.status as PositionStatus) ?? 'Available',
      supplier: value.supplier || undefined,
      widthCm: Number(value.widthCm ?? 0),
      heightCm: Number(value.heightCm ?? 0),
      note: value.note || undefined
    };

    this.positionService.update(updated).subscribe(() => {
      this.notifications.push({ message: `${updated.name} ažurirano`, type: 'success' });
      this.cancelEdit();
    });
  }

  exportReport(): void {
    combineLatest([this.positions$, this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))])
      .pipe(take(1))
      .subscribe(([positions, filters]) => {
        this.reportExport.exportToXlsx({
          data: positions,
          fileName: 'pozicije-izvjestaj',
          worksheetName: 'Pozicije',
          criteria: {
            Pretraga: filters.search || undefined,
            Status: filters.status || undefined,
            Dobavljač: filters.supplier || undefined,
            Tip: filters.type || undefined
          },
          mapRow: (position) => ({
            Naziv: position.name,
            Objekat: position.retailObjectName,
            Tip: position.positionType,
            Status: position.status,
            Dobavljač: position.supplier ?? '—',
            Širina: `${position.widthCm} cm`,
            Visina: `${position.heightCm} cm`,
            Površina: `${position.widthCm * position.heightCm} cm²`,
            Napomena: position.note ?? '—'
          })
        });
        this.notifications.push({ message: 'XLSX izvještaj generisan', type: 'success' });
      });
  }
}
