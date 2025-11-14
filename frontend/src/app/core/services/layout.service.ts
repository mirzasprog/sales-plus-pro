import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DesignerElement } from '../../features/layout-designer/models/designer-element';

@Injectable()
export class LayoutService {
  private readonly elements$ = new BehaviorSubject<DesignerElement[]>([]);
  readonly canvas$ = this.elements$.asObservable();

  setElements(elements: DesignerElement[]): void {
    this.elements$.next(elements);
  }

  addElement(element: DesignerElement): void {
    this.elements$.next([...this.elements$.value, element]);
  }

  updateElement(element: DesignerElement): void {
    this.elements$.next(this.elements$.value.map((item) => (item.id === element.id ? element : item)));
  }
}
