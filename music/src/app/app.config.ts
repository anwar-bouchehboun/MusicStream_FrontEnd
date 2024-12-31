import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { trackReducer } from './store/reducers/track.reducer';
import { TrackEffects } from './store/effects/track.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStore({ tracks: trackReducer }),
    provideEffects(TrackEffects),
    provideAnimations(),
  ],
};
