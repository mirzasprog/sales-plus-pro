import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LayoutDesignerComponent } from './components/layout-designer.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  { path: '', component: LayoutDesignerComponent }
];

@NgModule({
  declarations: [LayoutDesignerComponent],
  imports: [CommonModule, DragDropModule, SharedModule, RouterModule.forChild(routes)]
})
export class LayoutDesignerModule {}
