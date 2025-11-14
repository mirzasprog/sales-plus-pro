import { NgModule, Optional, SkipSelf } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { LayoutService } from './services/layout.service';
import { NotificationService } from './services/notification.service';
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  imports: [RouterModule],
  providers: [ApiService, AuthService, LayoutService, NotificationService, AuthGuard]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule?: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only');
    }
  }
}
