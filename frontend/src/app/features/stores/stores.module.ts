import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { StoreListPageComponent } from './pages/store-list-page.component';

const routes: Routes = [{ path: '', component: StoreListPageComponent }];

@NgModule({
  declarations: [StoreListPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(routes)]
})
export class StoresModule {}
