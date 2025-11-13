import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { LayoutService } from '../../../core/services/layout.service';
import { DesignerElement } from '../models/designer-element';

@Component({
  selector: 'app-layout-designer',
  templateUrl: './layout-designer.component.html',
  styleUrls: ['./layout-designer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutDesignerComponent {
  readonly elements$ = this.layoutService.canvas$;

  constructor(private readonly layoutService: LayoutService) {}

  addElement(type: string): void {
    const element: DesignerElement = {
      id: uuidv4(),
      label: `${type} ${Math.floor(Math.random() * 90 + 10)}`,
      type,
      width: 120,
      height: 80,
      x: 20,
      y: 20
    };
    this.layoutService.addElement(element);
  }

  dragEnded(event: CdkDragEnd, element: DesignerElement): void {
    const position = event.source.getFreeDragPosition();
    this.layoutService.updateElement({ ...element, x: position.x, y: position.y });
  }
}
