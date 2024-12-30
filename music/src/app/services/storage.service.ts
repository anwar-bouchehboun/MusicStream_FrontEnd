import { Injectable } from '@angular/core';
import { Track } from '../models/track.interface';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly TRACKS_STORE = 'tracks';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('musicDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.TRACKS_STORE)) {
          db.createObjectStore(this.TRACKS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  async saveTrack(track: Track, audioFile: File): Promise<void> {
    const fileData = await this.fileToBase64(audioFile);
    const trackWithAudio = { ...track, audioData: fileData };

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(
        [this.TRACKS_STORE],
        'readwrite'
      );
      const store = transaction?.objectStore(this.TRACKS_STORE);
      const request = store?.put(trackWithAudio);

      if (request) {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  getAllTracks(): Promise<Track[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([this.TRACKS_STORE], 'readonly');
      const store = transaction?.objectStore(this.TRACKS_STORE);
      const request = store?.getAll();

      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        resolve([]);
      }
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

 

}
