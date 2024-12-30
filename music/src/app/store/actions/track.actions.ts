import { createAction, props } from '@ngrx/store';
import { Track } from '../../models/track.interface';
import { PlaybackStatus } from '../../models/playerstate.interface';

// Track Actions
export const loadTracks = createAction('[Track] Load Tracks');
export const loadTracksSuccess = createAction(
  '[Track] Load Tracks Success',
  props<{ tracks: Track[] }>()
);
export const loadTracksFailure = createAction(
  '[Track] Load Tracks Failure',
  props<{ error: any }>()
);

export const addTrack = createAction(
  '[Track] Add Track',
  props<{ track: Track }>()
);
export const addTrackSuccess = createAction(
  '[Track] Add Track Success',
  props<{ track: Track }>()
);
export const addTrackFailure = createAction(
  '[Track] Add Track Failure',
  props<{ error: any }>()
);

export const updateTrack = createAction(
  '[Track] Update Track',
  props<{ track: Track }>()
);
export const deleteTrack = createAction(
  '[Track] Delete Track',
  props<{ id: string }>()
);

// Player Actions
export const play = createAction('[Player] Play', props<{ track: Track }>());
export const pause = createAction('[Player] Pause');
export const stop = createAction('[Player] Stop');
export const setVolume = createAction(
  '[Player] Set Volume',
  props<{ volume: number }>()
);
export const setCurrentTime = createAction(
  '[Player] Set Current Time',
  props<{ time: number }>()
);
export const setStatus = createAction(
  '[Player] Set Status',
  props<{ status: PlaybackStatus }>()
);

export const PlayerActions = {
  play,
  pause,
  stop,
  setVolume,
  setCurrentTime,
  setStatus,
};

export const TrackActions = {
  loadTracks,
  loadTracksSuccess,
  loadTracksFailure,
  addTrack,
  addTrackSuccess,
  addTrackFailure,
  updateTrack,
  deleteTrack,
};
