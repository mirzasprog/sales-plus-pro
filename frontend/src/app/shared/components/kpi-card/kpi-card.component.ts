import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number | string;
  @Input() accent: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() routerLink?: string | any[];
  @Input() action?: () => void;

  handleClick(event: Event): void {
    if (this.action && !this.routerLink) {
      event.preventDefault();
      this.action();
    }
  }
}
