import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthState {
  token: string | null;
  role: string | null;
  displayName: string | null;
  expiresAtUtc: string | null;
}

@Injectable()
export class AuthService {
  private readonly demoState: AuthState = {
    token: 'demo-token',
    role: 'Demo',
    displayName: 'Demo korisnik',
    expiresAtUtc: null
  };

  private readonly state$ = new BehaviorSubject<AuthState>(this.demoState);
  readonly authState$ = this.state$.asObservable();

  constructor(private readonly router: Router) {
    const saved = localStorage.getItem('retail-auth');
    if (saved) {
      this.state$.next(JSON.parse(saved));
    } else {
      localStorage.setItem('retail-auth', JSON.stringify(this.demoState));
    }
  }

  login(email: string, password: string): Observable<AuthState> {
    const state: AuthState = {
      ...this.demoState,
      displayName: email || this.demoState.displayName
    };

    return of(state).pipe(
      tap((nextState) => {
        this.state$.next(nextState);
        localStorage.setItem('retail-auth', JSON.stringify(nextState));
        this.router.navigate(['/dashboard']);
      })
    );
  }

  logout(): void {
    this.state$.next(this.demoState);
    localStorage.setItem('retail-auth', JSON.stringify(this.demoState));
    this.router.navigate(['/dashboard']);
  }

  get token(): string | null {
    return this.state$.value.token;
  }

  hasRole(roles: string[]): boolean {
    const role = this.state$.value.role;
    return !!role && roles.includes(role);
  }
}
