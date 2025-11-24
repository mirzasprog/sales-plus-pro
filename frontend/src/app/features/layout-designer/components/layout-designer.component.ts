import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { debounceTime, filter, map, Subject, takeUntil, tap, withLatestFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import Konva, { KonvaEventObject, Node as KonvaNode, Stage, Layer, Rect, Transformer } from 'konva';
import { LayoutService } from '../../../core/services/layout.service';
import { DesignerElement, DesignerElementType, LayoutDefinition } from '../models/designer-element';
import { PositionStatus } from '../../../shared/models/position-status';

@Component({
  selector: 'app-layout-designer',
  templateUrl: './layout-designer.component.html',
  styleUrls: ['./layout-designer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutDesignerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stageHost') stageHost?: ElementRef<HTMLDivElement>;

  readonly elements$ = this.layoutService.canvas$;
  readonly selectedElements$ = this.layoutService.selectedElements$;
  readonly selectedElement$ = this.layoutService.selectedElement$;
  readonly layoutMeta$ = this.layoutService.layoutMeta$;

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
  readonly gridSize = 20;
  snapToGrid = true;
  zoom = 1;

  // context menu (desni klik)
  contextMenu = { visible: false, x: 0, y: 0, targetId: '' };

  // modal (double click)
  editModal = { open: false, elementId: '' };

  readonly constructionTypes: DesignerElementType[] = ['Wall', 'Door', 'Window', 'Entrance', 'Cash Register'];

  private isPanning = false;
  private panOrigin: { x: number; y: number; stageX: number; stageY: number } | null = null;
  private stage?: Stage;
  private gridLayer?: Layer;
  private elementLayer?: Layer;
  private boundaryRect?: Rect;
  private transformer?: Transformer;
  private formPatching = false;
  private readonly destroy$ = new Subject<void>();

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

  // Desni panel
  readonly inspectorForm = this.fb.group({
    label: ['', [Validators.required, Validators.minLength(3)]],
    type: ['Gondola' as DesignerElementType, Validators.required],
    status: ['Available' as PositionStatus, Validators.required],
    width: [160, [Validators.required, Validators.min(10), Validators.max(2000)]],
    height: [120, [Validators.required, Validators.min(10), Validators.max(2000)]],
    rotation: [0, [Validators.min(-180), Validators.max(180)]],
    x: [0],
    y: [0],
    supplier: [''],
    note: ['']
  });

  // Modal za quick edit
  readonly modalForm = this.fb.group({
    label: ['', [Validators.required, Validators.minLength(3)]],
    type: ['Gondola' as DesignerElementType, Validators.required],
    status: ['Available' as PositionStatus],
    width: [0, [Validators.required, Validators.min(10), Validators.max(2000)]],
    height: [0, [Validators.required, Validators.min(10), Validators.max(2000)]],
    x: [0],
    y: [0],
    rotation: [0, [Validators.min(-180), Validators.max(180)]],
    supplier: [''],
    note: [''],
    price: [null as number | null],
    contractStart: [''],
    contractEnd: ['']
  });

  constructor(
    private readonly layoutService: LayoutService,
    private readonly fb: FormBuilder
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.layoutService.loadDemoLayout();

    // Sink selektovanog elementa u inspector form
    this.selectedElement$
      .pipe(takeUntil(this.destroy$))
      .subscribe((element) => {
        this.formPatching = true;
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
            supplier: '',
            note: ''
          });
        }
        this.formPatching = false;
      });

    // Promjene u inspector form -> update elementa
    this.inspectorForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(150),
        withLatestFrom(this.selectedElement$),
        filter(([, element]) => !!element),
        map(([formValue, element]) => ({ formValue, element: element as DesignerElement }))
      )
      .subscribe(({ formValue, element }) => {
        if (this.formPatching || this.inspectorForm.invalid) {
          return;
        }
        const updated: DesignerElement = {
          ...element,
          ...formValue,
          label: formValue.label ?? element.label,
          type: (formValue.type as DesignerElementType) ?? element.type,
          status: (formValue.status as PositionStatus) ?? element.status,
          width: Number(formValue.width ?? element.width),
          height: Number(formValue.height ?? element.height),
          rotation: Number(formValue.rotation ?? element.rotation),
          x: Number(formValue.x ?? element.x),
          y: Number(formValue.y ?? element.y),
          supplier: formValue.supplier ?? element.supplier,
          note: formValue.note ?? element.note
        };
        this.layoutService.updateElement(updated);
        this.updateTransformerSelection();
      });

    // Render elemenata
    this.elements$
      .pipe(takeUntil(this.destroy$))
      .subscribe((elements) => this.renderElements(elements));

    // Boundary
    this.layoutMeta$
      .pipe(
        takeUntil(this.destroy$),
        tap((layout) => this.drawBoundary(layout))
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    this.createStage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Paleta i drag & drop
  // ---------------------------------------------------------------------------

  handlePaletteClick(type: DesignerElementType): void {
    this.spawnElement(type, { x: 60, y: 60 });
  }

  handlePaletteDragStart(event: DragEvent, type: DesignerElementType): void {
    event.dataTransfer?.setData('application/element-type', type);
    event.dataTransfer?.setData('text/plain', type);
    event.dataTransfer?.setDragImage(new Image(), 0, 0);
  }

  handleCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  handleCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    const type = event.dataTransfer?.getData('application/element-type') as DesignerElementType;
    const host = this.stageHost?.nativeElement;
    if (!type || !host) {
      return;
    }

    // izračunaj lokalnu poziciju na canvasu
    const rect = host.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const defaults = this.defaultDimensions(type);
    const position = {
      x: pointer.x - defaults.width / 2,
      y: pointer.y - defaults.height / 2
    };
    this.spawnElement(type, position);
    this.contextMenu.visible = false;
  }

  showStatus(type: DesignerElementType): boolean {
    return !this.isConstruction(type);
  }

  // ---------------------------------------------------------------------------
  // Undo / redo / selection / layout
  // ---------------------------------------------------------------------------

  undo(): void {
    this.layoutService.undo();
    this.updateTransformerSelection();
  }

  redo(): void {
    this.layoutService.redo();
    this.updateTransformerSelection();
  }

  duplicateFromContext(): void {
    if (this.contextMenu.targetId) {
      this.duplicateElement(this.contextMenu.targetId);
    }
  }

  deleteFromContext(): void {
    if (this.contextMenu.targetId) {
      this.removeElement(this.contextMenu.targetId);
    }
  }

  bringToFront(): void {
    if (this.contextMenu.targetId) {
      this.moveLayer(this.contextMenu.targetId, 'front');
    }
  }

  sendToBack(): void {
    if (this.contextMenu.targetId) {
      this.moveLayer(this.contextMenu.targetId, 'back');
    }
  }

  clearSelection(): void {
    this.layoutService.selectElements([]);
    this.contextMenu.visible = false;
    this.updateTransformerSelection();
  }

  clearLayout(): void {
    this.layoutService.clearLayout();
    this.contextMenu.visible = false;
    this.updateTransformerSelection();
  }

  resetToDemo(): void {
    this.layoutService.loadDemoLayout();
    this.contextMenu.visible = false;
    this.updateTransformerSelection();
  }

  saveLayout(): void {
    this.layoutService.saveLayout().subscribe();
  }

  toggleSnap(): void {
    this.snapToGrid = !this.snapToGrid;
  }

  // ---------------------------------------------------------------------------
  // Zoom & fit
  // ---------------------------------------------------------------------------

  zoomIn(): void {
    this.applyZoom(this.zoom + 0.1);
  }

  zoomOut(): void {
    this.applyZoom(this.zoom - 0.1);
  }

  fitToContent(): void {
    const stage = this.stage;
    if (!stage) {
      return;
    }
    const elements = this.layoutService.snapshot;
    if (!elements.length) {
      this.applyZoom(1);
      stage.position({ x: 20, y: 20 });
      stage.batchDraw();
      return;
    }
    const minX = Math.min(...elements.map((el) => el.x));
    const minY = Math.min(...elements.map((el) => el.y));
    const maxX = Math.max(...elements.map((el) => el.x + el.width));
    const maxY = Math.max(...elements.map((el) => el.y + el.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 80;
    const scaleX = (stage.width() - padding) / contentWidth;
    const scaleY = (stage.height() - padding) / contentHeight;
    const nextZoom = Math.min(1.8, Math.max(0.4, Math.min(scaleX, scaleY)));

    this.applyZoom(nextZoom);

    stage.position({
      x: (stage.width() - contentWidth * nextZoom) / 2 - minX * nextZoom,
      y: (stage.height() - contentHeight * nextZoom) / 2 - minY * nextZoom
    });
    stage.batchDraw();
  }

  private applyZoom(value: number): void {
    const clamped = Math.min(2.4, Math.max(0.4, value));
    this.zoom = clamped;
    if (!this.stage) {
      return;
    }
    this.stage.scale({ x: clamped, y: clamped });
    this.stage.batchDraw();
    this.drawGrid(); // grid ovisi o zoomu
  }

  // ---------------------------------------------------------------------------
  // Stage / grid / boundary
  // ---------------------------------------------------------------------------

  private createStage(): void {
    const host = this.stageHost?.nativeElement;
    if (!host) {
      return;
    }

    const stage = new Konva.Stage({
      container: host,
      width: host.clientWidth,
      height: host.clientHeight,
      draggable: false
    });

    const gridLayer = new Konva.Layer({ listening: false });
    const elementLayer = new Konva.Layer();
    const transformer = new Konva.Transformer({
      borderStroke: '#0ea5e9'
    });

    elementLayer.add(transformer);
    stage.add(gridLayer);
    stage.add(elementLayer);

    // Zoom wheel – koristimo native event jer tvoj custom Konva ne emituje 'wheel'
    const stageElement = (stage as any).element as HTMLElement;
    stageElement.addEventListener('wheel', (evt: WheelEvent) => {
      evt.preventDefault();
      const scaleBy = 1.04;
      const oldScale = stage.scaleX();
      const rect = stageElement.getBoundingClientRect();
      const pointer = {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      };
      const direction = evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clamped = Math.min(2.4, Math.max(0.4, newScale));
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale
      };
      stage.scale({ x: clamped, y: clamped });
      const newPos = {
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped
      };
      stage.position(newPos);
      stage.batchDraw();
      this.zoom = clamped;
      this.drawGrid();
    });

    // Panning (space + drag ili srednji klik po želji – ovdje samo lijevi na prazno)
    stageElement.addEventListener('mousedown', (evt: MouseEvent) => {
      this.contextMenu.visible = false;
      const target = evt.target as HTMLElement;
      // Ako klik nije na elementu (designer-element), tretiramo kao pan
      const isStageClick = target === stageElement;
      if (isStageClick) {
        this.isPanning = true;
        this.panOrigin = { x: evt.clientX, y: evt.clientY, stageX: stage.x(), stageY: stage.y() };
      }
    });

    stageElement.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.panOrigin = null;
    });

    stageElement.addEventListener('mousemove', (evt: MouseEvent) => {
      if (!this.isPanning || !this.panOrigin) {
        return;
      }
      const dx = evt.clientX - this.panOrigin.x;
      const dy = evt.clientY - this.panOrigin.y;
      stage.position({ x: this.panOrigin.stageX + dx, y: this.panOrigin.stageY + dy });
      stage.batchDraw();
    });

    this.stage = stage;
    this.gridLayer = gridLayer;
    this.elementLayer = elementLayer;
    this.transformer = transformer;

    this.drawGrid();
  }

  private drawGrid(): void {
    const layer = this.gridLayer;
    const stage = this.stage;
    if (!layer || !stage) {
      return;
    }

    layer.destroyChildren();
    const gridSize = this.gridSize;
    const width = stage.width() / this.zoom;
    const height = stage.height() / this.zoom;

    for (let i = 0; i < width / gridSize; i++) {
      const line = new Konva.Line({
        points: [Math.round(i * gridSize), 0, Math.round(i * gridSize), height],
        stroke: '#0f172a',
        strokeWidth: 0.4
      });
      layer.add(line);
    }
    for (let j = 0; j < height / gridSize; j++) {
      const line = new Konva.Line({
        points: [0, Math.round(j * gridSize), width, Math.round(j * gridSize)],
        stroke: '#0f172a',
        strokeWidth: 0.4
      });
      layer.add(line);
    }
    layer.batchDraw();
  }

  private drawBoundary(layout: LayoutDefinition | null): void {
    if (!this.elementLayer || !layout) {
      return;
    }
    if (this.boundaryRect) {
      this.boundaryRect.destroy();
    }
    this.boundaryRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: layout.boundaryWidth,
      height: layout.boundaryHeight,
      stroke: '#22c55e',
      strokeWidth: 1.2,
      dash: [6, 4],
      listening: false
    });
    this.elementLayer.add(this.boundaryRect);
    this.elementLayer.batchDraw();
  }

  // ---------------------------------------------------------------------------
  // Render elemenata
  // ---------------------------------------------------------------------------

  private renderElements(elements: DesignerElement[]): void {
    const layer = this.elementLayer;
    const transformer = this.transformer;
    if (!layer || !transformer) {
      return;
    }

    // Očisti stare elemente (osim boundary i transformera)
    layer
      .getChildren((node: KonvaNode) => node !== transformer && node !== this.boundaryRect)
      .forEach((node: KonvaNode) => node.destroy());

    for (const element of elements) {
      const group = new Konva.Group({
        id: element.id,
        x: element.x,
        y: element.y,
        draggable: true,
        rotation: element.rotation,
        name: 'designer-element'
      });

      const rect = new Konva.Rect({
        width: element.width,
        height: element.height,
        cornerRadius: element.type === 'Wall' ? 2 : 8,
        stroke: this.statusColor(element.status),
        strokeWidth: 2,
        fill: this.typeStyle(element.type).fill
      });

      const baseLabel = this.typeStyle(element.type).label;
      const label = new Konva.Text({
        text: `${baseLabel} • ${element.label}`,
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        fill: '#e2e8f0',
        padding: 6
      });

      const dimension = new Konva.Text({
        text: `${element.width}×${element.height} cm` + (element.supplier ? ` • ${element.supplier}` : ''),
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        fill: '#cbd5e1',
        padding: 6,
        y: rect.height() - 24
      });

      label.width(rect.width());
      dimension.width(rect.width());

      group.add(rect);
      group.add(label);
      group.add(dimension);

      // Drag + snap
      group.on('dragmove', () => {
        if (this.snapToGrid) {
          const snappedX = Math.round(group.x() / this.gridSize) * this.gridSize;
          const snappedY = Math.round(group.y() / this.gridSize) * this.gridSize;
          group.position({ x: snappedX, y: snappedY });
        }
        this.inspectorForm.patchValue({ x: group.x(), y: group.y() }, { emitEvent: false });
      });

      group.on('dragend', () => {
        this.layoutService.updateElement({ ...element, x: group.x(), y: group.y() });
      });

      // Transform (resize/rotate) – kompatibilno s tvojim custom Transformerom
      group.on('transformend', () => {
        // u tvom wrapperu Transformer direktno mijenja width/height na targetu (ovdje group)
        const nextWidth = group.width();
        const nextHeight = group.height();
        const nextRotation = group.rotation();

        rect.width(nextWidth);
        rect.height(nextHeight);
        label.width(nextWidth);
        dimension.width(nextWidth);
        dimension.y(nextHeight - 24);

        this.layoutService.updateElement({
          ...element,
          x: group.x(),
          y: group.y(),
          width: Math.round(nextWidth),
          height: Math.round(nextHeight),
          rotation: Math.round(nextRotation)
        });
      });

      // Selektovanje – jedan klik → selekcija + transformer vezan
      group.on('click tap', (evt: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const isMulti = (evt.evt as any).shiftKey || (evt.evt as any).metaKey;
        this.handleElementSelection(element.id, isMulti);
      });

      // Double-click → modal
      group.on('dblclick dbltap', () => {
        this.openFixtureModal(element);
      });

      // Right-click → context meni
      group.on('contextmenu', (evt: KonvaEventObject<MouseEvent>) => {
        evt.evt.preventDefault();
        const isMulti = (evt.evt as any).shiftKey || (evt.evt as any).metaKey;
        this.handleElementSelection(element.id, isMulti);
        this.contextMenu = {
          visible: true,
          x: evt.evt.clientX,
          y: evt.evt.clientY,
          targetId: element.id
        };
      });

      layer.add(group);
    }

    this.updateTransformerSelection();
    layer.batchDraw();
  }

  // ---------------------------------------------------------------------------
  // Selektovanje & transformer
  // ---------------------------------------------------------------------------

  private handleElementSelection(id: string, multiSelect: boolean): void {
    const current = this.layoutService.selectedIds;
    const next = multiSelect
      ? current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      : [id];

    this.layoutService.selectElements(next);
    this.contextMenu.visible = false;
    this.updateTransformerSelection();
  }

  private updateTransformerSelection(): void {
    const transformer = this.transformer;
    const layer = this.elementLayer;
    if (!transformer || !layer) {
      return;
    }

    const nodes = layer
      .getChildren()
      .filter((child: KonvaNode) => {
        const id = (child as any).id?.();
        return (child as any).name?.() === 'designer-element' && !!id && this.layoutService.selectedIds.includes(id);
      });

    // veži transformer na selektirane node-ove; tvoj custom Transformer će sam prikazati/sakriti okvir
    transformer.nodes(nodes as KonvaNode[]);
    layer.draw();
  }

  // ---------------------------------------------------------------------------
  // Helperi za stil i tipove
  // ---------------------------------------------------------------------------

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

  isConstruction(type: DesignerElementType): boolean {
    return this.constructionTypes.includes(type);
  }

  // ---------------------------------------------------------------------------
  // CRUD nad elementima
  // ---------------------------------------------------------------------------

  private spawnElement(type: DesignerElementType, position: { x: number; y: number }): void {
    const defaults = this.defaultDimensions(type);
    const baseX = this.snapToGrid ? Math.round(position.x / this.gridSize) * this.gridSize : position.x;
    const baseY = this.snapToGrid ? Math.round(position.y / this.gridSize) * this.gridSize : position.y;

    const element: DesignerElement = {
      id: uuidv4(),
      label: `${this.typeStyles[type]?.label ?? type} ${Math.floor(Math.random() * 90 + 10)}`,
      type,
      status: 'Available',
      width: defaults.width,
      height: defaults.height,
      x: Math.max(0, baseX),
      y: Math.max(0, baseY),
      rotation: 0,
      supplier: this.isConstruction(type) ? undefined : defaults.supplier,
      note: defaults.note
    };

    this.layoutService.addElement(element);
  }

  private duplicateElement(id: string): void {
    const original = this.layoutService.snapshot.find((item) => item.id === id);
    if (!original) {
      return;
    }
    const copy: DesignerElement = {
      ...original,
      id: uuidv4(),
      label: `${original.label} (kopija)`,
      x: original.x + 20,
      y: original.y + 20,
      updatedAt: new Date().toISOString()
    };
    this.layoutService.addElement(copy);
    this.contextMenu.visible = false;
  }

  private removeElement(id: string): void {
    this.layoutService.removeElement(id);
    this.contextMenu.visible = false;
  }

  private moveLayer(id: string, direction: 'front' | 'back'): void {
    const elements = [...this.layoutService.snapshot];
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) {
      return;
    }
    const [item] = elements.splice(index, 1);

    if (direction === 'front') {
      elements.push(item);
    } else {
      elements.unshift(item);
    }

    this.layoutService.importElements(elements);
    this.layoutService.selectElement(id);
    this.contextMenu.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Modal (quick edit)
  // ---------------------------------------------------------------------------

  private openFixtureModal(element: DesignerElement): void {
    this.editModal = { open: true, elementId: element.id };
    this.layoutService.selectElement(element.id);
    this.updateTransformerSelection();

    this.modalForm.patchValue({
      ...element,
      price: (element as any).price ?? null,
      contractStart: (element as any).contractStart ?? '',
      contractEnd: (element as any).contractEnd ?? ''
    });

    if (this.isConstruction(element.type)) {
      this.modalForm.patchValue(
        { status: 'Available', supplier: '' },
        { emitEvent: false }
      );
    }
  }

  closeModal(): void {
    this.editModal = { open: false, elementId: '' };
  }

  saveModal(): void {
    if (!this.editModal.elementId || this.modalForm.invalid) {
      return;
    }
    const existing = this.layoutService.snapshot.find((item) => item.id === this.editModal.elementId);
    if (!existing) {
      return;
    }

    const formValue = this.modalForm.value;
    const type = formValue.type as DesignerElementType;
    const isConstruction = this.isConstruction(type);

    const cleanedSupplier = isConstruction ? undefined : formValue.supplier ?? existing.supplier;
    const cleanedStatus: PositionStatus = isConstruction
      ? existing.status
      : ((formValue.status as PositionStatus) ?? existing.status);

    const updated: DesignerElement = {
      ...existing,
      ...formValue,
      type,
      status: cleanedStatus,
      supplier: cleanedSupplier,
      rotation: Math.round(formValue.rotation ?? existing.rotation)
    } as DesignerElement;

    this.layoutService.updateElement(updated);
    this.updateTransformerSelection();
    this.closeModal();
  }

  // ---------------------------------------------------------------------------
  // Default dimenzije po tipu
  // ---------------------------------------------------------------------------

  private defaultDimensions(type: DesignerElementType): { width: number; height: number; note?: string; supplier?: string } {
    switch (type) {
      case 'Entrance':
        return { width: 120, height: 80, note: 'Ulaz / izlaz kupaca' };
      case 'Cash Register':
        return { width: 240, height: 140, note: 'Prostor blagajne s POS opremom', supplier: 'TechNova' };
      case 'Display Case':
        return { width: 200, height: 140, note: 'Vitrina za rashlađene proizvode', supplier: 'Fresh & Co' };
      case 'Shelf':
        return { width: 160, height: 320, note: 'Polica uz zid s visinom', supplier: 'Fresh & Co' };
      case 'Door':
        return { width: 100, height: 24, note: 'Vrata / prolaz' };
      case 'Window':
        return { width: 220, height: 20, note: 'Prozor ili izlog' };
      case 'Wall':
        return { width: 400, height: 22, note: 'Segment zida (može se produžiti)' };
      case 'Counter':
        return { width: 220, height: 120, note: 'Pult za usluge ili degustaciju', supplier: 'Local Craft' };
      case 'Promo':
        return { width: 200, height: 140, note: 'Planirano za istaknute akcije', supplier: 'BeautyLine' };
      case 'Stand':
        return { width: 140, height: 160, note: 'Slobodno stojeći stalak', supplier: 'Local Craft' };
      default:
        return { width: 200, height: 120, note: 'Standardni modul', supplier: 'Fresh & Co' };
    }
  }
}
