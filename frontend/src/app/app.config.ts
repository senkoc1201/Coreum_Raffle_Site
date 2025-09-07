import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MainDashboardComponent } from './components/main-dashboard/main-dashboard.component';
import { JoinRaffleComponent } from './components/join-raffle/join-raffle.component';
import { RaffleDetailsComponent } from './components/raffle-details/raffle-details.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([
      { path: '', component: MainDashboardComponent },
      { path: 'dashboard', component: MainDashboardComponent },
      { path: 'join', component: JoinRaffleComponent },
      { path: 'raffle-detail', component: RaffleDetailsComponent },
      { path: 'raffles/:id', component: RaffleDetailsComponent }
    ]),
    provideAnimationsAsync(),
    provideHttpClient(),
    importProvidersFrom(ReactiveFormsModule)
  ]
};
