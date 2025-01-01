import { createSelector } from '@ngrx/store';

import { TrackState } from '../reducers/track.reducer';

export const selectTrackState = (state: any) => state.tracks;

export const selectAllTracks = createSelector(
  selectTrackState,
  (state: TrackState) => state.tracks
);

export const selectTrackById = (id: string) =>
  createSelector(selectAllTracks, (tracks) => {
    const track = tracks.find((t) => t.id === id);
    console.log('Track trouvé par selecteur:', track); // Debug
    return track;
  });
