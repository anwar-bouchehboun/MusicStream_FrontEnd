import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Track } from '../models/track.interface';
import { PlayerActions } from '../store/actions/track.actions';
import { PlaybackStatus } from '../models/playerstate.interface';
import { AppState } from '../models/app.state';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audio: HTMLAudioElement;
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private currentTrack: Track | null = null;

  constructor(private store: Store<AppState>) {
    this.audio = new Audio();
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.setupAudioGraph();
    this.setupAudioListeners();
  }

  private setupAudioGraph(): void {
    // Créer le graphe audio
    this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  private setupAudioListeners(): void {
    this.audio.addEventListener('loadedmetadata', () => {
      this.store.dispatch(
        PlayerActions.setDuration({ duration: this.audio.duration })
      );
    });

    this.audio.addEventListener('timeupdate', () => {
      this.store.dispatch(
        PlayerActions.setCurrentTime({ time: this.audio.currentTime })
      );
    });

    this.audio.addEventListener('playing', () => {
      this.store.dispatch(
        PlayerActions.setStatus({ status: PlaybackStatus.PLAYING })
      );
    });

    this.audio.addEventListener('pause', () => {
      this.store.dispatch(
        PlayerActions.setStatus({ status: PlaybackStatus.PAUSED })
      );
    });

    this.audio.addEventListener('ended', () => {
      this.store.dispatch(
        PlayerActions.setStatus({ status: PlaybackStatus.STOPPED })
      );
    });

    this.audio.addEventListener('error', () => {
      this.store.dispatch(
        PlayerActions.setStatus({ status: PlaybackStatus.ERROR })
      );
    });

    // Ajouter des listeners pour le buffering
    this.audio.addEventListener('waiting', () => {
      this.store.dispatch(
        PlayerActions.setStatus({ status: PlaybackStatus.BUFFERING })
      );
    });

    this.audio.addEventListener('canplay', () => {
      if (this.audio.paused) {
        this.store.dispatch(
          PlayerActions.setStatus({ status: PlaybackStatus.PAUSED })
        );
      }
    });
  }

  async play(track: Track): Promise<void> {
    // Démarrer le contexte audio si suspendu
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.currentTrack?.id !== track.id) {
      this.currentTrack = track;
      try {
        // Nettoyer l'ancienne URL blob
        if (this.audio.src && this.audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.audio.src);
        }

        let audioUrl: string;

        // Si nous avons un File object, créer une nouvelle URL blob
        if (track.audioFile instanceof File) {
          audioUrl = URL.createObjectURL(track.audioFile);
        } else if (track.fileUrl) {
          audioUrl = track.fileUrl;
        } else {
          throw new Error('Aucune source audio valide');
        }

        this.audio.src = audioUrl;
        this.audio.load();

        console.log('Nouvelle URL audio:', audioUrl);

        // Ajouter un fade-in
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(
          1,
          this.audioContext.currentTime + 0.5
        );
      } catch (error) {
        console.error('Erreur de configuration audio:', error);
        this.store.dispatch(
          PlayerActions.setStatus({
            status: PlaybackStatus.ERROR,
            error: 'Format audio non supporté ou fichier invalide',
          })
        );
        return;
      }
    }

    try {
      await this.audio.play();
      this.store.dispatch(PlayerActions.play({ track }));
    } catch (error) {
      console.error('Erreur de lecture:', error);
      this.store.dispatch(
        PlayerActions.setStatus({
          status: PlaybackStatus.ERROR,
          error: 'Impossible de lire le fichier audio',
        })
      );
    }
  }

  pause(): void {
    // Ajouter un fade-out avant la pause
    const fadeOutDuration = 0.3;
    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + fadeOutDuration
    );

    setTimeout(() => {
      this.audio.pause();
      this.store.dispatch(PlayerActions.pause());
    }, fadeOutDuration * 1000);
  }

  seek(position: number): void {
    const newTime = position * this.audio.duration;
    if (isFinite(newTime)) {
      // Ajouter un petit crossfade lors du seek
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.audio.currentTime = newTime;
      this.gainNode.gain.linearRampToValueAtTime(
        1,
        this.audioContext.currentTime + 0.1
      );
    }
  }

  setVolume(volume: number): void {
    // Utiliser une courbe logarithmique pour un contrôle plus naturel du volume
    const value = Math.max(0.0001, volume);
    this.gainNode.gain.setValueAtTime(
      Math.log10(value) + 1,
      this.audioContext.currentTime
    );
    this.store.dispatch(PlayerActions.setVolume({ volume }));
  }

  async next(track: Track): Promise<void> {
    const nextIndex = (this.audio.currentTime + 1) % track.duration;
    this.audio.currentTime = nextIndex;
    this.audio.play();
    this.play(track);

  }

  async previous(track: Track): Promise<void> {
    const prevIndex = (this.audio.currentTime - 1 + track.duration) % track.duration;
    this.audio.currentTime = prevIndex;
    this.audio.play();
   // this.play(track);
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }
}
