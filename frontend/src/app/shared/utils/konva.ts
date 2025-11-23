export interface KonvaEventObject<T = any> {
  evt: T;
  target: Node;
}

type EventHandler = (evt: KonvaEventObject<any>) => void;

export class Node {
  element: HTMLElement;
  parentNode?: Container;
  private listeners = new Map<string, EventHandler[]>();
  private _id?: string;
  private _name?: string;
  private _rotation = 0;
  private _scaleX = 1;
  private _scaleY = 1;
  private _x = 0;
  private _y = 0;
  private _draggable = false;

  constructor(element: HTMLElement, opts: Record<string, any> = {}) {
    this.element = element;
    this._id = opts['id'];
    this._name = opts['name'];
    this._x = opts['x'] ?? 0;
    this._y = opts['y'] ?? 0;
    this._rotation = opts['rotation'] ?? 0;
    this._draggable = opts['draggable'] ?? false;
    this.applyTransforms();
    if (this._draggable) {
      this.registerDrag();
    }
  }

  id(): string | undefined {
    return this._id;
  }

  name(): string | undefined {
    return this._name;
  }

  getParent(): Container | undefined {
    return this.parentNode;
  }

  x(value?: number): number {
    if (value === undefined) {
      return this._x;
    }
    this._x = value;
    this.applyTransforms();
    return this._x;
  }

  y(value?: number): number {
    if (value === undefined) {
      return this._y;
    }
    this._y = value;
    this.applyTransforms();
    return this._y;
  }

  position(pos?: { x: number; y: number }): { x: number; y: number } {
    if (!pos) {
      return { x: this._x, y: this._y };
    }
    this._x = pos.x;
    this._y = pos.y;
    this.applyTransforms();
    return pos;
  }

  rotation(value?: number): number {
    if (value === undefined) {
      return this._rotation;
    }
    this._rotation = value;
    this.applyTransforms();
    return this._rotation;
  }

  scale(scale?: { x: number; y: number }): { x: number; y: number } {
    if (!scale) {
      return { x: this._scaleX, y: this._scaleY };
    }
    this._scaleX = scale.x;
    this._scaleY = scale.y;
    this.applyTransforms();
    return scale;
  }

  scaleX(): number {
    return this._scaleX;
  }

  scaleY(): number {
    return this._scaleY;
  }

  width(value?: number): number {
    if (value === undefined) {
      return this.element.getBoundingClientRect().width;
    }
    this.element.style.width = `${value}px`;
    return value;
  }

  height(value?: number): number {
    if (value === undefined) {
      return this.element.getBoundingClientRect().height;
    }
    this.element.style.height = `${value}px`;
    return value;
  }

  destroy(): void {
    this.element.remove();
  }

  on(eventName: string, handler: EventHandler): void {
    const collection = this.listeners.get(eventName) ?? [];
    collection.push(handler);
    this.listeners.set(eventName, collection);
  }

  emit(eventName: string, evt: any): void {
    this.listeners.get(eventName)?.forEach((handler) => handler({ evt, target: this }));
  }

  private applyTransforms(): void {
    this.element.style.position = 'absolute';
    this.element.style.transformOrigin = 'top left';
    this.element.style.transform = `translate(${this._x}px, ${this._y}px) rotate(${this._rotation}deg) scale(${this._scaleX}, ${
      this._scaleY
    })`;
  }

  private registerDrag(): void {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originX = this._x;
      originY = this._y;
      this.element.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      this.position({ x: originX + dx, y: originY + dy });
      this.emit('dragmove', event);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      this.emit('dragend', event);
      this.element.releasePointerCapture(event.pointerId);
    };

    this.element.addEventListener('pointerdown', onPointerDown);
    this.element.addEventListener('pointermove', onPointerMove);
    this.element.addEventListener('pointerup', onPointerUp);
    this.element.addEventListener('pointercancel', onPointerUp);
  }
}

class Container extends Node {
  children: Node[] = [];

  constructor(element: HTMLElement, opts: Record<string, any> = {}) {
    super(element, opts);
  }

  add(child: Node): this {
    this.children.push(child);
    child.parentNode = this;
    this.element.appendChild(child.element);
    return this;
  }

  destroyChildren(): void {
    this.children.forEach((child) => child.destroy());
    this.children = [];
  }

  getChildren(filterFn?: (node: Node) => boolean): Node[] {
    if (!filterFn) {
      return this.children;
    }
    return this.children.filter(filterFn);
  }

  batchDraw(): void {
    // no-op for DOM implementation
  }

  draw(): void {
    // no-op placeholder for compatibility
  }
}

class Stage extends Container {
  private _width: number;
  private _height: number;
  private _scale = { x: 1, y: 1 };
  private pointer: { x: number; y: number } = { x: 0, y: 0 };

  constructor(opts: { container: HTMLElement; width: number; height: number; draggable?: boolean }) {
    const stageEl = document.createElement('div');
    stageEl.style.position = 'relative';
    stageEl.style.width = `${opts.width}px`;
    stageEl.style.height = `${opts.height}px`;
    stageEl.style.overflow = 'hidden';
    stageEl.style.touchAction = 'none';
    opts.container.appendChild(stageEl);
    super(stageEl, { draggable: opts.draggable ?? false });
    this._width = opts.width;
    this._height = opts.height;

    stageEl.addEventListener('mousemove', (evt) => {
      this.pointer = { x: evt.offsetX, y: evt.offsetY };
    });
    stageEl.addEventListener('touchmove', (evt) => {
      const touch = evt.touches[0];
      this.pointer = { x: touch.clientX, y: touch.clientY };
    });
  }

  override width(value?: number): number {
    if (value !== undefined) {
      this._width = value;
      this.element.style.width = `${value}px`;
    }
    return this._width;
  }

  override height(value?: number): number {
    if (value !== undefined) {
      this._height = value;
      this.element.style.height = `${value}px`;
    }
    return this._height;
  }

  override scale(value?: { x: number; y: number }): { x: number; y: number } {
    if (!value) {
      return this._scale;
    }
    this._scale = value;
    this.element.style.transform = `translate(${this.x()}px, ${this.y()}px) scale(${value.x}, ${value.y})`;
    return value;
  }

  override scaleX(): number {
    return this._scale.x;
  }

  override scaleY(): number {
    return this._scale.y;
  }

  override position(pos?: { x: number; y: number }): { x: number; y: number } {
    if (!pos) {
      return super.position();
    }
    super.position(pos);
    this.element.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${this._scale.x}, ${this._scale.y})`;
    return pos;
  }

  getPointerPosition(): { x: number; y: number } {
    return this.pointer;
  }
}

class Layer extends Container {
  constructor(opts: { listening?: boolean } = {}) {
    const layerEl = document.createElement('div');
    layerEl.style.position = 'absolute';
    layerEl.style.left = '0';
    layerEl.style.top = '0';
    layerEl.style.right = '0';
    layerEl.style.bottom = '0';
    layerEl.style.pointerEvents = opts.listening === false ? 'none' : 'auto';
    super(layerEl, opts);
  }
}

class Group extends Container {
  constructor(opts: Record<string, any> = {}) {
    const groupEl = document.createElement('div');
    groupEl.style.position = 'absolute';
    groupEl.style.boxSizing = 'border-box';
    super(groupEl, opts);
  }
}

class Rect extends Node {
  constructor(opts: Record<string, any>) {
    const rectEl = document.createElement('div');
    rectEl.style.position = 'absolute';
    rectEl.style.boxSizing = 'border-box';
    rectEl.style.border = `${opts['strokeWidth'] ?? 1}px solid ${opts['stroke'] ?? '#fff'}`;
    rectEl.style.background = opts['fill'] ?? 'transparent';
    rectEl.style.borderRadius = `${opts['cornerRadius'] ?? 0}px`;
    rectEl.style.width = `${opts['width'] ?? 0}px`;
    rectEl.style.height = `${opts['height'] ?? 0}px`;
    super(rectEl, opts);
  }
}

class Text extends Node {
  constructor(opts: Record<string, any>) {
    const textEl = document.createElement('div');
    textEl.textContent = opts['text'] ?? '';
    textEl.style.fontSize = `${opts['fontSize'] ?? 14}px`;
    textEl.style.fontFamily = opts['fontFamily'] ?? 'Arial, sans-serif';
    textEl.style.color = opts['fill'] ?? '#fff';
    textEl.style.padding = `${opts['padding'] ?? 0}px`;
    textEl.style.position = 'absolute';
    textEl.style.boxSizing = 'border-box';
    textEl.style.whiteSpace = 'nowrap';
    if (opts['y'] !== undefined) {
      textEl.style.top = `${opts['y']}px`;
    }
    super(textEl, opts);
  }
}

class Line extends Node {
  constructor(opts: { points: number[]; stroke?: string; strokeWidth?: number }) {
    const lineEl = document.createElement('div');
    lineEl.style.position = 'absolute';
    lineEl.style.background = opts.stroke ?? '#fff';
    const [x1, y1, x2, y2] = opts.points;
    const width = Math.abs(x2 - x1) || (opts.strokeWidth ?? 1);
    const height = Math.abs(y2 - y1) || (opts.strokeWidth ?? 1);
    lineEl.style.width = `${width}px`;
    lineEl.style.height = `${height}px`;
    super(lineEl, { x: Math.min(x1, x2), y: Math.min(y1, y2) });
  }
}

class Transformer extends Node {
  private targets: Node[] = [];
  private box: HTMLDivElement;
  private handles: HTMLDivElement[] = [];

  constructor(opts: Record<string, any> = {}) {
    const wrap = document.createElement('div');
    wrap.style.position = 'absolute';
    wrap.style.border = `1px dashed ${opts['borderStroke'] ?? '#0ea5e9'}`;
    wrap.style.pointerEvents = 'none';
    super(wrap, opts);
    this.box = wrap;
  }

  nodes(nodes: Node[]): void {
    this.targets = nodes;
    this.render();
  }

  private render(): void {
    this.box.innerHTML = '';
    this.handles = [];
    if (!this.targets.length) {
      this.box.style.display = 'none';
      return;
    }
    this.box.style.display = 'block';
    const target = this.targets[0];
    const rect = target.element.getBoundingClientRect();
    const parentRect = (target.getParent()?.element ?? target.element.parentElement ?? document.body).getBoundingClientRect();
    const offsetX = rect.left - parentRect.left;
    const offsetY = rect.top - parentRect.top;
    this.box.style.left = `${offsetX}px`;
    this.box.style.top = `${offsetY}px`;
    this.box.style.width = `${rect.width}px`;
    this.box.style.height = `${rect.height}px`;
    this.box.style.transform = `rotate(${target.rotation()}deg)`;

    const positions: Array<{ cursor: string; dx: number; dy: number }> = [
      { cursor: 'nwse-resize', dx: -1, dy: -1 },
      { cursor: 'nesw-resize', dx: 1, dy: -1 },
      { cursor: 'nwse-resize', dx: -1, dy: 1 },
      { cursor: 'nesw-resize', dx: 1, dy: 1 }
    ];

    positions.forEach((pos) => {
      const handle = document.createElement('div');
      handle.style.position = 'absolute';
      handle.style.width = '12px';
      handle.style.height = '12px';
      handle.style.background = '#0ea5e9';
      handle.style.borderRadius = '50%';
      handle.style.pointerEvents = 'auto';
      handle.style.cursor = pos.cursor;
      handle.style.transform = 'translate(-50%, -50%)';
      handle.style.left = pos.dx < 0 ? '0' : '100%';
      handle.style.top = pos.dy < 0 ? '0' : '100%';
      this.addResize(handle, target, pos.dx, pos.dy);
      this.box.appendChild(handle);
      this.handles.push(handle);
    });

    const rotateHandle = document.createElement('div');
    rotateHandle.style.position = 'absolute';
    rotateHandle.style.width = '14px';
    rotateHandle.style.height = '14px';
    rotateHandle.style.background = '#f59e0b';
    rotateHandle.style.borderRadius = '50%';
    rotateHandle.style.cursor = 'grab';
    rotateHandle.style.left = '50%';
    rotateHandle.style.top = '-24px';
    rotateHandle.style.transform = 'translate(-50%, -50%)';
    this.addRotation(rotateHandle, target, rect, parentRect);
    this.box.appendChild(rotateHandle);
  }

  private addResize(handle: HTMLElement, target: Node, dirX: number, dirY: number): void {
    let startWidth = 0;
    let startHeight = 0;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (event: PointerEvent) => {
      startWidth = target.width();
      startHeight = target.height();
      startX = event.clientX;
      startY = event.clientY;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event: PointerEvent) => {
      const diffX = (event.clientX - startX) * dirX;
      const diffY = (event.clientY - startY) * dirY;
      const nextWidth = Math.max(20, startWidth + diffX);
      const nextHeight = Math.max(20, startHeight + diffY);
      target.width(nextWidth);
      target.height(nextHeight);
      this.render();
    };

    const onPointerUp = (event: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      target.emit('transformend', event);
    };

    handle.addEventListener('pointerdown', onPointerDown);
  }

  private addRotation(handle: HTMLElement, target: Node, rect: DOMRect, parentRect: DOMRect): void {
    let startAngle = target.rotation();
    let centerX = 0;
    let centerY = 0;

    const onPointerDown = (event: PointerEvent) => {
      centerX = parentRect.left + rect.width / 2;
      centerY = parentRect.top + rect.height / 2;
      startAngle = target.rotation();
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event: PointerEvent) => {
      const angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI;
      target.rotation(angle - 90);
      this.render();
    };

    const onPointerUp = (event: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      target.emit('transformend', event);
    };

    handle.addEventListener('pointerdown', onPointerDown);
  }
}

const Konva = {
  Stage,
  Layer,
  Group,
  Rect,
  Text,
  Line,
  Transformer,
  Node,
  KonvaEventObject: class {}
};

export { Stage, Layer, Group, Rect, Text, Line, Transformer };
export default Konva;
