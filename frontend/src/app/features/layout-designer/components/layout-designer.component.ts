import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, map, takeUntil } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { LayoutService } from '../../../core/services/layout.service';
import { DesignerElement, DesignerElementType } from '../models/designer-element';
import { PositionStatus } from '../../../shared/models/position-status';

@Component({
  selector: 'app-layout-designer',
  templateUrl: './layout-designer.component.html',
  styleUrls: ['./layout-designer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutDesignerComponent implements OnInit, OnDestroy {
  readonly elements$ = this.layoutService.canvas$;
  readonly selectedElement$ = this.layoutService.selectedElement$;
  readonly selectedId$ = this.layoutService.selectedElement$.pipe(map((element) => element?.id ?? null));

  readonly palette: { type: DesignerElementType; hint: string }[] = [
    { type: 'Gondola', hint: 'Standardni gondola modul' },
    { type: 'Promo', hint: 'Promo zona ili kraj gondole' },
    { type: 'Stand', hint: 'Slobodno stojeći stalak' },
    { type: 'Cash Register', hint: 'Blagajna / POS' },
    { type: 'Entrance', hint: 'Ulaz / izlaz kupaca' }
  ];

  readonly statusOptions: PositionStatus[] = ['Available', 'Reserved', 'Occupied', 'ExpiringSoon', 'Inactive'];
  zoom = 1;
  snapToGrid = true;
  readonly gridSize = 20;

  readonly inspectorForm = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.minLength(3)]],
    type: ['Gondola' as DesignerElementType, Validators.required],
    status: ['Available' as PositionStatus, Validators.required],
    width: [160, [Validators.required, Validators.min(60), Validators.max(520)]],
    height: [120, [Validators.required, Validators.min(60), Validators.max(520)]],
    rotation: [0, [Validators.min(-45), Validators.max(45)]],
    x: [0],
    y: [0],
    note: ['']
  });

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly layoutService: LayoutService, private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.layoutService.loadDemoLayout();

    this.selectedElement$.pipe(takeUntil(this.destroy$)).subscribe((element) => {
      if (element) {
        this.inspectorForm.patchValue(element, { emitEvent: false });
      } else {
        this.inspectorForm.reset({
          label: '',
          type: 'Gondola',
          status: 'Available',
          width: 160,
          height: 120,
          rotation: 0,
          x: 0,
          y: 0,
          note: ''
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addElement(type: DesignerElementType): void {
    const element: DesignerElement = {
      id: uuidv4(),
      label: `${type} ${Math.floor(Math.random() * 90 + 10)}`,
      type,
      status: 'Available',
      width: type === 'Entrance' ? 120 : 180,
      height: type === 'Entrance' ? 80 : 120,
      x: 40,
      y: 40,
      rotation: 0,
      note: type === 'Promo' ? 'Planirano za istaknute akcije' : ''
    };
    this.layoutService.addElement(element);
  }

  dragEnded(event: CdkDragEnd, element: DesignerElement): void {
    const position = event.source.getFreeDragPosition();
    const nextX = this.snapToGrid ? Math.round(position.x / this.gridSize) * this.gridSize : position.x;
    const nextY = this.snapToGrid ? Math.round(position.y / this.gridSize) * this.gridSize : position.y;
    this.layoutService.updateElement({ ...element, x: nextX, y: nextY });
  }

  selectElement(element: DesignerElement): void {
    this.layoutService.selectElement(element.id);
  }

  clearSelection(): void {
    this.layoutService.selectElement(null);
  }

  applyInspector(element: DesignerElement | null): void {
    if (!element || this.inspectorForm.invalid) {
      this.inspectorForm.markAllAsTouched();
      return;
    }

    const formValue = this.inspectorForm.getRawValue();
    const updated: DesignerElement = {
      ...element,
      label: formValue.label || element.label,
      type: formValue.type || element.type,
      status: formValue.status || element.status,
      width: formValue.width ?? element.width,
      height: formValue.height ?? element.height,
      rotation: formValue.rotation ?? element.rotation,
      x: formValue.x ?? element.x,
      y: formValue.y ?? element.y,
      note: formValue.note ?? ''
    };
    this.layoutService.updateElement(updated);
  }

  removeElement(element: DesignerElement | null): void {
    if (!element) {
      return;
    }
    this.layoutService.removeElement(element.id);
  }

  resetToDemo(): void {
    this.layoutService.loadDemoLayout();
  }

  zoomIn(): void {
    this.zoom = Math.min(1.4, this.zoom + 0.1);
  }

  zoomOut(): void {
    this.zoom = Math.max(0.6, this.zoom - 0.1);
  }

  trackById(_: number, element: DesignerElement): string {
    return element.id;
  }

  statusColor(status: PositionStatus): string {
    switch (status) {
      case 'Available':
        return '#16a34a';
      case 'Reserved':
        return '#2563eb';
      case 'ExpiringSoon':
        return '#f97316';
      case 'Inactive':
        return '#94a3b8';
      default:
        return '#dc2626';
    }
  }
}
