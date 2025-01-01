import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Track } from '../../models/track.interface';
import { AudioService } from '../../services/audio.service';
import { selectTrackById } from '../../store/selectors/track.selectors';
import { FormatDurationPipe } from '../../shared/pipes/format-duration.pipe';
import { PlayerActions } from '../../store/actions/track.actions';
import { AppState } from '../../models/app.state';
import { PlaybackStatus } from '../../models/playerstate.interface';
import { firstValueFrom } from 'rxjs';
import { TrackService } from '../../services/track.service';

@Component({
  selector: 'app-track-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSliderModule,
    MatProgressBarModule,
    FormatDurationPipe,
  ],
  templateUrl: './track-detail.component.html',
})
export class TrackDetailComponent implements OnInit {
  track$: Observable<Track | undefined>;
  isPlaying$ = this.store.select(
    (state: AppState) => state.player.status === PlaybackStatus.PLAYING
  );
  currentTime$ = this.store.select(
    (state: AppState) => state.player.currentTime
  );
  duration$ = this.store.select((state: AppState) => state.player.duration);
  volume$ = this.store.select((state: AppState) => state.player.volume);
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

  constructor(
    private route: ActivatedRoute,
    private store: Store<AppState>,
    private audioService: AudioService,
    private trackService: TrackService
  ) {
    const trackId = this.route.snapshot.paramMap.get('id');
    this.track$ = this.store.select(selectTrackById(trackId || ''));
  }

  ngOnInit() {
    // Initialiser le volume
    this.onVolumeChange(0.7);
  }

  async onPlay(track: Track) {
    if (!track) {
      console.error('Aucune piste sélectionnée');
      return;
    }

    // Logs plus détaillés pour déboguer
    /*  console.log('Track reçu dans onPlay:', {
      id: track.id,
      fileUrl: track.fileUrl,
      audioFile: track.audioFile,
      // Ajoutez d'autres propriétés que vous attendez
      allProps: Object.keys(track),
    });
    */

    try {
      let audioUrl = track.fileUrl;

      if (!audioUrl) {
        const trackData = await firstValueFrom(
          this.trackService.getTrackById(track.id)
        );
        audioUrl = trackData?.fileUrl || '';
      }

      if (!audioUrl) {
        throw new Error('URL du fichier audio manquante');
      }

    //  new URL(audioUrl); // Vérifier si l'URL est valide

      this.audioService.play({ ...track, fileUrl: audioUrl });
    } catch (e) {
      console.error('Erreur lors de la lecture:', e);
      this.store.dispatch(
        PlayerActions.setStatus({
          status: PlaybackStatus.ERROR,
          error: 'URL du fichier audio invalide ou manquante',
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
    const rect = progressBar.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    this.audioService.seek(clampedPosition);
  }

  onVolumeChange(volume: number | null) {
    if (volume !== null) {
      // Ajouter une validation supplémentaire
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.audioService.setVolume(clampedVolume);
    }
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
}
