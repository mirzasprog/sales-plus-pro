import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  { path: 'login', component: LoginPageComponent }
];

@NgModule({
  declarations: [LoginPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(routes)]
})
export class AuthModule {}
