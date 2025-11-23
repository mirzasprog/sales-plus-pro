import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate() {
    return this.auth.authState$.pipe(
      map((state) => {
        if (!state.token) {
          // Demo mod: ako nema spremljenog tokena, automatski kreiraj demo sesiju i pusti pristup
          this.auth.logout();
        }

        return true;
      })
    );
  }
}
