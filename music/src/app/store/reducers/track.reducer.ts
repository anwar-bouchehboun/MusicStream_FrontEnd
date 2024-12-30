import { createReducer, on } from '@ngrx/store';
import { Track } from '../../models/track.interface';
import * as TrackActions from '../actions/track.actions';

export interface TrackState {
  tracks: Track[];
  loading: boolean;
  error: any;
}

const initialState: TrackState = {
  tracks: [],
  loading: false,
  error: null,
};

export const trackReducer = createReducer(
  initialState,
  on(TrackActions.loadTracks, (state) => ({
    ...state,
    loading: true,
  })),
  on(TrackActions.loadTracksSuccess, (state, { tracks }) => ({
    ...state,
    tracks,
    loading: false,
  })),
  on(TrackActions.addTrackSuccess, (state, { track }) => ({
    ...state,
    tracks: [...state.tracks, track],
  }))
);
