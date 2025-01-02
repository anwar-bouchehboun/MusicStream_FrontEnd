import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MusicCategory, Track } from '../../models/track.interface';
import { AudioService } from '../../services/audio.service';
import { selectTrackById } from '../../store/selectors/track.selectors';
import { FormatDurationPipe } from '../../shared/pipes/format-duration.pipe';
import { PlayerActions } from '../../store/actions/track.actions';
import { AppState } from '../../models/app.state';
import { PlaybackStatus } from '../../models/playerstate.interface';
import { firstValueFrom } from 'rxjs';
import { TrackService } from '../../services/track.service';
import { take } from 'rxjs/operators';
import { selectVolume } from '../../store/selectors/track.selectors';
import { TrackActions } from '../../store/actions/track.actions';
import { tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-track-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSliderModule,
    MatProgressBarModule,
    FormatDurationPipe,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './track-detail.component.html',
  styleUrls: ['./track-detail.component.css'],
})
export class TrackDetailComponent implements OnInit, OnDestroy {
  track$: Observable<Track> = this.store
    .select(selectTrackById(''))
    .pipe(map((track) => track || this.defaultTrack));
  isPlaying$ = this.store.select(
    (state: AppState) => state.player.status === PlaybackStatus.PLAYING
  );
  currentTime$ = this.store.select(
    (state: AppState) => state.player.currentTime
  );
  duration$ = this.store.select((state: AppState) => state.player.duration);
  volume$ = this.store.select(selectVolume);
  playerStatus$ = this.store.select((state: AppState) => state.player.status);
  bufferedTime$ = this.store.select(
    (state: AppState) => state.player.bufferedTime
  );
  isBuffering$ = this.store.select(
    (state: AppState) => state.player.status === PlaybackStatus.BUFFERING
  );

  canGoNext$ = this.store.select((state) => {
    const playlist = state.player.playlist;
    const currentTrack = state.player.currentTrack;
    if (!playlist || !currentTrack) return false;

    const currentIndex = playlist.findIndex(
      (track) => track.id === currentTrack.id
    );
    return currentIndex < playlist.length - 1;
  });

  canGoPrevious$ = this.store.select((state) => {
    const playlist = state.player.playlist;
    const currentTrack = state.player.currentTrack;
    if (!playlist || !currentTrack) return false;

    const currentIndex = playlist.findIndex(
      (track) => track.id === currentTrack.id
    );
    return currentIndex > 0 || this.audioService.getCurrentTime() > 3;
  });

  // private previousVolume = 0.7;

  // Add this property to track if player should be shown
  showPlayer = true;

  // Add this property for empty state
  defaultTrack: Track = {
    id: '',
    title: 'No track selected',
    artist: 'Please select a track',
    description: '',
    fileUrl: '',
    duration: 0,
    category: 'other' as MusicCategory,
    addedDate: new Date(),
    coverUrl: 'assets/images/music.png',
  };

  private destroy$ = new Subject<void>();

  volumeControl = new FormControl(0);

  constructor(
    private route: ActivatedRoute,
    private store: Store<AppState>,
    private audioService: AudioService,
    private trackService: TrackService
  ) {
    this.initializeTrack();
  }

  ngOnInit() {
    // Initialize volume
    this.onVolumeChange(0.7);

    // Set up volume control subscription
    this.volume$
      .pipe(takeUntil(this.destroy$))
      .subscribe((vol) => this.volumeControl.setValue(vol ?? 0));
  }

  ngOnDestroy() {
    // Nettoyage des souscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Nettoyage des ressources audio
    this.audioService.cleanup();

    // Nettoyage de l'état du lecteur
    this.store.dispatch(PlayerActions.setCurrentTrack({ track: null }));
    this.store.dispatch(
      PlayerActions.setStatus({ status: PlaybackStatus.STOPPED })
    );

    // Suppression des données en cache si nécessaire
    const trackId = this.route.snapshot.paramMap.get('id');
    if (trackId) {
      localStorage.removeItem(`track_${trackId}`);
      localStorage.removeItem(this.audioService.PLAYER_STATE_KEY);
    }
  }

  private initializeTrack() {
    const trackId = this.route.snapshot.paramMap.get('id');
    if (trackId) {
      // Add takeUntil to all subscriptions
      this.trackService
        .getTrackById(trackId)
        .pipe(
          take(1),
          takeUntil(this.destroy$),
          tap(async (track) => {
            if (track) {
              // Store track in localStorage
              localStorage.setItem(`track_${trackId}`, JSON.stringify(track));

              // Update store
              this.store.dispatch(TrackActions.addTrack({ track }));
              this.store.dispatch(PlayerActions.setCurrentTrack({ track }));

              // Try to restore player state
              const playerState = localStorage.getItem(
                this.audioService.PLAYER_STATE_KEY
              );
              if (playerState) {
                const state = JSON.parse(playerState);
                if (state.trackId === trackId) {
                  await this.audioService.play(track);
                  if (state.currentTime) {
                    this.audioService.seek(state.currentTime / state.duration);
                  }
                  if (state.volume !== undefined) {
                    this.audioService.setVolume(state.volume);
                  }
                }
              }
            }
          })
        )
        .subscribe();

      // Set up track$ observable
      this.track$ = this.store.select(selectTrackById(trackId)).pipe(
        takeUntil(this.destroy$),
        map((track) => {
          // Try to get from localStorage if not in store
          if (!track) {
            const cached = localStorage.getItem(`track_${trackId}`);
            if (cached) {
              const cachedTrack = JSON.parse(cached);
              this.store.dispatch(
                TrackActions.addTrack({ track: cachedTrack })
              );
              return cachedTrack;
            }
            return this.defaultTrack;
          }
          return track;
        })
      );
    }
  }

  private async tryRestorePlayerState(track: Track) {
    try {
      const savedState = localStorage.getItem(
        this.audioService.PLAYER_STATE_KEY
      );
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.track?.id === track.id) {
          // Only restore if it's the same track
          await this.audioService.restorePlayerState();
        }
      }
    } catch (error) {
      console.error('Error restoring player state:', error);
    }
  }

  async onPlay(track: Track) {
    console.log('onPlay', track);
    if (!track) {
      console.error('No track selected');
      return;
    }

    try {
      const trackData = await firstValueFrom(
        this.trackService.getTrackById(track.id)
      );

      if (!trackData?.fileUrl) {
        throw new Error('Audio file URL is missing');
      }

      await this.audioService.play({ ...track, fileUrl: trackData.fileUrl });
    } catch (e) {
      console.error('Playback error:', e);
      this.store.dispatch(
        PlayerActions.setStatus({
          status: PlaybackStatus.LOADING,
        })
      );
    }
  }

  onPause() {
    this.audioService.pause();
  }

  /*
  async onPrevious() {
    const currentTrack = await firstValueFrom(this.track$);
    console.log('currentTrack', currentTrack);
    if (currentTrack) {
      this.store.dispatch(PlayerActions.previous());
      const previousTrack = await firstValueFrom(
        this.trackService.getPreviousTrack(currentTrack.id)
      );
      console.log('previousTrack', previousTrack);
      if (previousTrack) {
        this.onPlay(previousTrack);
      }
    }
  }*/

  /* async onNext() {
    const currentTrack = await firstValueFrom(this.track$);
    if (!currentTrack) return;

    const nextTrack = await firstValueFrom(
      this.trackService.getNextTrack(currentTrack.id)
    );

    if (nextTrack) {
      this.store.dispatch(PlayerActions.next());
      this.onPlay(nextTrack);
    } else {
      // Utiliser un toast ou un message plus élégant
      console.info('Vous êtes à la dernière piste de la playlist');
    }
  }*/

  onSeek(event: MouseEvent) {
    const progressBar = event.currentTarget as HTMLElement;
    const bounds = progressBar.getBoundingClientRect();
    const percent = (event.clientX - bounds.left) / bounds.width;
    this.audioService.seek(percent);
  }

  onVolumeChange(value: number | null) {
    if (value !== null) {
      this.audioService.setVolume(value);
    }
  }

  getMute(): void {
    this.volume$.pipe(take(1)).subscribe((volume) => {
      this.setVolume(volume > 0 ? 0 : 100);
    });
  }
  setVolume(value: number): void {
    this.audioService.setVolume(value / 100);
  }
  getStatusMessage(status: string): string {
    switch (status) {
      case PlaybackStatus.BUFFERING:
        return 'Chargement en cours...';
      case PlaybackStatus.ERROR:
        return 'Erreur lors de la lecture';
      case PlaybackStatus.LOADING:
        return 'Chargement du fichier...';
      default:
        return '';
    }
  }

  onNext(track: Track): void {
    this.audioService.next(track);
  }

  async onPrevious(track: Track): Promise<void> {
    this.audioService.previous(track);
  }

  getProgressBarValue(): number {
    let currentTime = 0;
    let duration = 1;

    this.currentTime$
      .pipe(take(1))
      .subscribe((time) => (currentTime = time || 0));
    this.duration$.pipe(take(1)).subscribe((d) => (duration = d || 1));

    return (currentTime / duration) * 100;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  onToggleMute() {
    this.volume$.pipe(take(1)).subscribe((volume) => {
      this.audioService.toggleMute(volume || 0);
    });
  }
}
