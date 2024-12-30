import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { from, Observable } from 'rxjs';
import { Track } from '../models/track.interface';
import { PlayerActions } from '../store/actions/track.actions';
import { PlaybackStatus } from '../models/playerstate.interface';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audio: HTMLAudioElement;

  constructor(private store: Store) {
    this.audio = new Audio();
    this.setupAudioListeners();
  }

  private setupAudioListeners(): void {
    this.audio.addEventListener('playing', () => {
      this.store.dispatch(
        PlayerActions['setStatus']({ status: PlaybackStatus.PLAYING })
      );
    });

    this.audio.addEventListener('pause', () => {
      this.store.dispatch(
        PlayerActions['setStatus']({ status: PlaybackStatus.PAUSED })
      );
    });

    this.audio.addEventListener('timeupdate', () => {
      this.store.dispatch(
        PlayerActions['setCurrentTime']({ time: this.audio.currentTime })
      );
    });
  }

  play(track: Track): void {
    this.audio.src = track.fileUrl;
    this.audio.play();
    this.store.dispatch(PlayerActions['play']({ track }));
  }

  pause(): void {
    this.audio.pause();
    this.store.dispatch(PlayerActions['pause']());
  }

  setVolume(volume: number): void {
    this.audio.volume = volume;
    this.store.dispatch(PlayerActions['setVolume']({ volume }));
  }
}
