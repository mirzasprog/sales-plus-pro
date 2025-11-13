import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

export interface AuthState {
  token: string | null;
  role: string | null;
  displayName: string | null;
  expiresAtUtc: string | null;
}

@Injectable()
export class AuthService {
  private readonly state$ = new BehaviorSubject<AuthState>({ token: null, role: null, displayName: null, expiresAtUtc: null });
  readonly authState$ = this.state$.asObservable();

  constructor(private readonly api: ApiService, private readonly router: Router) {
    const saved = localStorage.getItem('retail-auth');
    if (saved) {
      this.state$.next(JSON.parse(saved));
    }
  }

  login(email: string, password: string): Observable<AuthState> {
    return this.api
      .post<{ token: string; role: string; displayName: string | null; expiresAtUtc: string }>('auth/login', { email, password })
      .pipe(
        tap((response) => {
          const state: AuthState = {
            token: response.token,
            role: response.role,
            displayName: response.displayName,
            expiresAtUtc: response.expiresAtUtc
          };
          this.state$.next(state);
          localStorage.setItem('retail-auth', JSON.stringify(state));
          this.router.navigate(['/dashboard']);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('retail-auth');
    this.state$.next({ token: null, role: null, displayName: null, expiresAtUtc: null });
    this.router.navigate(['/auth/login']);
  }

  get token(): string | null {
    return this.state$.value.token;
  }

  hasRole(roles: string[]): boolean {
    const role = this.state$.value.role;
    return !!role && roles.includes(role);
  }
}
