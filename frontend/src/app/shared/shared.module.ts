import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { PositionStatusBadgeComponent } from './components/position-status-badge/position-status-badge.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';

@NgModule({
  declarations: [KpiCardComponent, PositionStatusBadgeComponent, NotificationCenterComponent],
  imports: [CommonModule, RouterModule],
  exports: [CommonModule, RouterModule, KpiCardComponent, PositionStatusBadgeComponent, NotificationCenterComponent]
})
export class SharedModule {}
