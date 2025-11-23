import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, AfterViewInit, ViewChild } from '@angular/core';
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
export class LayoutDesignerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('surface') surfaceRef?: ElementRef<HTMLDivElement>;

  readonly elements$ = this.layoutService.canvas$;
  readonly selectedElement$ = this.layoutService.selectedElement$;
  readonly selectedId$ = this.layoutService.selectedElement$.pipe(map((element) => element?.id ?? null));

  readonly palette: { type: DesignerElementType; hint: string }[] = [
    { type: 'Gondola', hint: 'Standardni gondola modul' },
    { type: 'Promo', hint: 'Promo kraj gondole ili dodatna vidljivost' },
    { type: 'Stand', hint: 'Slobodno stojeći stalak' },
    { type: 'Cash Register', hint: 'Blagajna / POS' },
    { type: 'Entrance', hint: 'Ulaz / izlaz kupaca' },
    { type: 'Display Case', hint: 'Vitrina ili rashladna jedinica' },
    { type: 'Shelf', hint: 'Polica uz zid ili gondolu' },
    { type: 'Door', hint: 'Vrata / prolaz' },
    { type: 'Window', hint: 'Prozor ili izlog' },
    { type: 'Wall', hint: 'Zid ili linijski element' },
    { type: 'Counter', hint: 'Pult za uslugu ili degustaciju' }
  ];

  readonly statusOptions: PositionStatus[] = ['Available', 'Reserved', 'Occupied', 'ExpiringSoon', 'Inactive'];
  zoom = 1;
  panX = 0;
  panY = 0;
  snapToGrid = true;
  readonly gridSize = 20;
  private isPanning = false;
  private lastPanPoint: { x: number; y: number } | null = null;

  readonly typeStyles: Record<DesignerElementType, { icon: string; color: string; fill: string; label: string }> = {
    Entrance: { icon: '⛩', color: '#10b981', fill: 'rgba(16, 185, 129, 0.14)', label: 'Ulaz' },
    Gondola: { icon: '🛒', color: '#6366f1', fill: 'rgba(99, 102, 241, 0.14)', label: 'Gondola' },
    Promo: { icon: '⭐', color: '#f59e0b', fill: 'rgba(245, 158, 11, 0.16)', label: 'Promo' },
    Stand: { icon: '🧰', color: '#3b82f6', fill: 'rgba(59, 130, 246, 0.14)', label: 'Stalak' },
    'Cash Register': { icon: '💳', color: '#ef4444', fill: 'rgba(239, 68, 68, 0.14)', label: 'Blagajna' },
    'Display Case': { icon: '🧊', color: '#14b8a6', fill: 'rgba(20, 184, 166, 0.16)', label: 'Vitrina' },
    Shelf: { icon: '📚', color: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.16)', label: 'Polica' },
    Door: { icon: '🚪', color: '#0ea5e9', fill: 'rgba(14, 165, 233, 0.18)', label: 'Vrata' },
    Window: { icon: '🪟', color: '#38bdf8', fill: 'rgba(56, 189, 248, 0.16)', label: 'Prozor' },
    Wall: { icon: '⬛', color: '#475569', fill: 'rgba(15, 23, 42, 0.2)', label: 'Zid' },
    Counter: { icon: '🧾', color: '#e11d48', fill: 'rgba(225, 29, 72, 0.16)', label: 'Pult' }
  };

  readonly inspectorForm = this.fb.group({
    label: ['', [Validators.required, Validators.minLength(3)]],
    type: ['Gondola' as DesignerElementType, Validators.required],
    status: ['Available' as PositionStatus, Validators.required],
    width: [160, [Validators.required, Validators.min(30), Validators.max(1200)]],
    height: [120, [Validators.required, Validators.min(10), Validators.max(1200)]],
    rotation: [0, [Validators.min(-180), Validators.max(180)]],
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

    this.inspectorForm
      .get('type')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        const statusControl = this.inspectorForm.get('status');
        if (!statusControl) {
          return;
        }
        if (!this.showStatus(type as DesignerElementType)) {
          statusControl.disable({ emitEvent: false });
        } else {
          statusControl.enable({ emitEvent: false });
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.fitToContent(), 0);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.fitToContent(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addElement(type: DesignerElementType): void {
    const defaults = this.defaultDimensions(type);
    const element: DesignerElement = {
      id: uuidv4(),
      label: `${this.typeStyles[type]?.label ?? type} ${Math.floor(Math.random() * 90 + 10)}`,
      type,
      status: 'Available',
      width: defaults.width,
      height: defaults.height,
      x: 80,
      y: 80,
      rotation: 0,
      note: defaults.note
    };
    this.layoutService.addElement(element);
    this.selectElement(element);
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

  showStatus(type: DesignerElementType): boolean {
    return !['Door', 'Window', 'Cash Register', 'Wall'].includes(type);
  }

  clearSelection(): void {
    this.layoutService.selectElement(null);
  }

  applyInspector(element: DesignerElement | null): void {
    if (!element || this.inspectorForm.invalid) {
      this.inspectorForm.markAllAsTouched();
      return;
    }

    const formValue = this.inspectorForm.value;
    const updated: DesignerElement = {
      ...element,
      ...formValue,
      label: formValue.label ?? element.label,
      type: formValue.type ?? element.type,
      status: formValue.status ?? element.status,
      width: formValue.width ?? element.width,
      height: formValue.height ?? element.height,
      rotation: formValue.rotation ?? 0,
      x: formValue.x ?? 0,
      y: formValue.y ?? 0,
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

  clearLayout(): void {
    this.layoutService.clearLayout();
  }

  resetToDemo(): void {
    this.layoutService.loadDemoLayout();
    this.fitToContent();
  }

  zoomIn(): void {
    this.zoom = this.clampZoom(this.zoom + 0.1);
  }

  zoomOut(): void {
    this.zoom = this.clampZoom(this.zoom - 0.1);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    this.zoom = this.clampZoom(this.zoom + delta);
  }

  startPan(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.element')) {
      return;
    }

    this.isPanning = true;
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  }

  pan(event: MouseEvent): void {
    if (!this.isPanning || !this.lastPanPoint) {
      return;
    }

    const dx = event.clientX - this.lastPanPoint.x;
    const dy = event.clientY - this.lastPanPoint.y;
    this.panX += dx;
    this.panY += dy;
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
  }

  endPan(): void {
    this.isPanning = false;
    this.lastPanPoint = null;
  }

  fitToContent(): void {
    const surface = this.surfaceRef?.nativeElement;
    const elements = this.layoutService.snapshot;

    if (!surface) {
      return;
    }

    if (!elements.length) {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      return;
    }

    const minX = Math.min(...elements.map((el) => el.x));
    const minY = Math.min(...elements.map((el) => el.y));
    const maxX = Math.max(...elements.map((el) => el.x + el.width));
    const maxY = Math.max(...elements.map((el) => el.y + el.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const viewportWidth = surface.clientWidth || 1200;
    const viewportHeight = surface.clientHeight || 720;
    const padding = 120;
    const scaleX = (viewportWidth - padding) / contentWidth;
    const scaleY = (viewportHeight - padding) / contentHeight;
    const nextZoom = this.clampZoom(Math.min(scaleX, scaleY));

    this.zoom = nextZoom;
    this.panX = (viewportWidth - contentWidth * nextZoom) / 2 - minX * nextZoom;
    this.panY = (viewportHeight - contentHeight * nextZoom) / 2 - minY * nextZoom;
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

  typeStyle(type: DesignerElementType): { icon: string; color: string; fill: string; label: string } {
    return this.typeStyles[type] ?? { icon: '⬜', color: '#334155', fill: 'rgba(51, 65, 85, 0.14)', label: type };
  }

  private defaultDimensions(type: DesignerElementType): { width: number; height: number; note?: string } {
    switch (type) {
      case 'Entrance':
        return { width: 120, height: 80, note: 'Ulaz / izlaz kupaca' };
      case 'Cash Register':
        return { width: 240, height: 140, note: 'Prostor blagajne s POS opremom' };
      case 'Display Case':
        return { width: 200, height: 140, note: 'Vitrina za rashlađene proizvode' };
      case 'Shelf':
        return { width: 160, height: 320, note: 'Polica uz zid s visinom' };
      case 'Door':
        return { width: 100, height: 24, note: 'Vrata / prolaz' };
      case 'Window':
        return { width: 220, height: 20, note: 'Prozor ili izlog' };
      case 'Wall':
        return { width: 400, height: 22, note: 'Segment zida (može se produžiti)' };
      case 'Counter':
        return { width: 220, height: 120, note: 'Pult za usluge ili degustaciju' };
      case 'Promo':
        return { width: 200, height: 140, note: 'Planirano za istaknute akcije' };
      case 'Stand':
        return { width: 140, height: 160, note: 'Slobodno stojeći stalak' };
      default:
        return { width: 200, height: 120, note: 'Standardni modul' };
    }
  }

  private clampZoom(value: number): number {
    return Math.min(1.8, Math.max(0.4, value));
  }
}
