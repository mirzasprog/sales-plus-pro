import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { PositionsPageComponent } from './pages/positions-page.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  { path: '', component: PositionsPageComponent }
];

@NgModule({
  declarations: [PositionsPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(routes)]
})
export class PositionsModule {}
