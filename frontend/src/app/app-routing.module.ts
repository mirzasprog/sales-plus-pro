import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/dashboard/dashboard.module').then((m) => m.DashboardModule)
  },
  {
    path: 'positions',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/positions/positions.module').then((m) => m.PositionsModule)
  },
  {
    path: 'stores',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/stores/stores.module').then((m) => m.StoresModule)
  },
  {
    path: 'suppliers',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/suppliers/suppliers.module').then((m) => m.SuppliersModule)
  },
  {
    path: 'layout',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/layout-designer/layout-designer.module').then((m) => m.LayoutDesignerModule)
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
