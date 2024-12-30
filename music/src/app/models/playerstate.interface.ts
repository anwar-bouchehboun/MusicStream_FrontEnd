import { Track } from "./track.interface";

export interface PlayerState {
  currentTrack: Track | null;
  status: PlaybackStatus;
  volume: number;
  currentTime: number;
}

export enum PlaybackStatus {
  PLAYING = 'playing',
  PAUSED = 'paused',
  BUFFERING = 'buffering',
  STOPPED = 'stopped',
  LOADING = 'loading',
  ERROR = 'error',
}
