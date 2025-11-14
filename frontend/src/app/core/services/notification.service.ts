import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable()
export class NotificationService {
  private readonly stream$ = new Subject<Notification>();
  readonly notifications$ = this.stream$.asObservable();

  push(notification: Notification): void {
    this.stream$.next(notification);
  }
}
