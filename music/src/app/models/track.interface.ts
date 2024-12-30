export interface Track {
  id: string;
  title: string;
  artist: string;
  description?: string;
  duration: number;
  category: MusicCategory;
  addedDate: Date;
  fileUrl: string;
}

export enum MusicCategory {
  POP = 'pop',
  ROCK = 'rock',
  RAP = 'rap',
  CHAABI = 'cha3bi',
  OTHER = 'other',
}

