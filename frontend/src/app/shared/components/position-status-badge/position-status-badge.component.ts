import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PositionStatus } from '../../models/position-status';

@Component({
  selector: 'app-position-status-badge',
  templateUrl: './position-status-badge.component.html',
  styleUrls: ['./position-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionStatusBadgeComponent {
  @Input({ required: true }) status!: PositionStatus;

  get label(): string {
    switch (this.status) {
      case 'Available':
        return 'Slobodno';
      case 'Reserved':
        return 'Rezervirano';
      case 'Occupied':
        return 'Zauzeto';
      case 'ExpiringSoon':
        return 'Ističe uskoro';
      default:
        return 'Neaktivno';
    }
  }
}
