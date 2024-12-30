import { createAction, props } from '@ngrx/store';
import { Track } from '../models/track.interface';

export const addTrack = createAction(
  '[Track] Add Track',
  props<{ track: Track }>()
);

export const addTrackSuccess = createAction(
  '[Track] Add Track Success',
  props<{ track: Track }>()
);
