import { Injectable } from '@angular/core';
import { concat, map, Observable, of, Subject, switchMap, timer } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable()
export class NotificationService {
  private readonly stream$ = new Subject<Notification>();
  readonly notifications$: Observable<Notification | null> = this.stream$.pipe(
    switchMap((notification) =>
      concat(
        of(notification),
        timer(3800).pipe(
          map(() => null)
        )
      )
    )
  );

  push(notification: Notification): void {
    this.stream$.next(notification);
  }
}
