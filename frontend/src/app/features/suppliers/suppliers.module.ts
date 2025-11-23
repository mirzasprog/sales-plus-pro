import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SupplierListPageComponent } from './pages/supplier-list-page.component';

const routes: Routes = [{ path: '', component: SupplierListPageComponent }];

@NgModule({
  declarations: [SupplierListPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(routes)]
})
export class SuppliersModule {}
