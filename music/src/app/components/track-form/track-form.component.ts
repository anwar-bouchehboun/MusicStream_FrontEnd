import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { Track, MusicCategory } from '../../models/track.interface';
import { TrackActions } from '../../store/actions/track.actions';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { TrackService } from '../../services/track.service';
import { HttpClientModule } from '@angular/common/http';
import { selectTrackById } from '../../store/selectors/track.selectors';
import { uniqueTitleValidator } from '../../shared/validators/unique-title.validator';
import { AppState } from '../../models/app.state';

@Component({
  selector: 'app-track-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    HttpClientModule,
  ],
  providers: [TrackService],
  template: `
    <div
      class="container p-4 mx-auto w-full bg-gray-300 rounded-lg shadow-md md:w-1/2"
    >
      <h1 class="text-9xl font-bold text-center uppercase">
        {{ isEditMode ? 'Modifier' : 'Ajouter' }} une chanson
      </h1>
      <form [formGroup]="trackForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Titre</mat-label>
          <input matInput formControlName="title" maxlength="50" />
        </mat-form-field>

        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Artiste</mat-label>
          <input matInput formControlName="artist" />
        </mat-form-field>

        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            maxlength="200"
          ></textarea>
        </mat-form-field>

        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Catégorie</mat-label>
          <mat-select formControlName="category">
            <mat-option value="">Sélectionner une catégorie</mat-option>
            <mat-option *ngFor="let category of categories" [value]="category">
              {{ category }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="file-input-container">
          <button
            mat-raised-button
            color="accent"
            type="button"
            (click)="fileInput.click()"
          >
            <mat-icon>cloud_upload</mat-icon>
            <span class="ml-2">Charger</span>
          </button>
          <input
            #fileInput
            formControlName="audioFile"
            type="file"
            (change)="onFileSelected($event)"
            accept=".mp3,.wav,.ogg"
            style="display: none"
          />
          <span class="file-name" *ngIf="audioFile">
            {{ audioFile.name }}
          </span>
        </div>

        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="trackForm.invalid"
        >
          {{ isEditMode ? 'Modifier' : 'Ajouter' }}
          <mat-icon class="ml-2">{{
            isEditMode ? 'edit' : 'add_circle'
          }}</mat-icon>
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .file-input-container {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 1rem 0;
      }
      .file-name {
        color: rgba(0, 0, 0, 0.87);
        font-size: 10px;
      }
    `,
  ],
})
export class TrackFormComponent implements OnInit {
  trackForm!: FormGroup;
  categories = Object.values(MusicCategory);
  audioFile?: File;
  duration?: number;
  isEditMode = false;
  currentTrackId?: string;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private router: Router,
    private route: ActivatedRoute,
    private storageService: TrackService,
    private trackService: TrackService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.currentTrackId = params['id'];
        this.loadTrack(params['id']);
      }
    });
  }

  private initForm() {
    this.trackForm = this.fb.group({
      title: [
        '',
        [Validators.required, Validators.maxLength(50)],
        //   [uniqueTitleValidator(this.trackService)],
      ],
      artist: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(200)]],
      category: ['', [Validators.required]],
      audioFile: [null, [Validators.required]],
    });
  }

  private loadTrack(id: string) {
    this.store.select(selectTrackById(id)).subscribe((track) => {
      if (track) {
        this.trackForm.patchValue({
          title: track.title,
          artist: track.artist,
          description: track.description,
          category: track.category,
        });
        this.duration = track.duration;
      }
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.audioFile = file;
      this.calculateDuration(file);
    }
  }

  private calculateDuration(file: File): void {
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      this.duration = audio.duration;
      URL.revokeObjectURL(audio.src);
    };
  }

  onSubmit(): void {
    if (this.trackForm.valid) {
      const trackData = {
        ...this.trackForm.value,
        duration: this.duration,
      };

      if (this.isEditMode && this.currentTrackId) {
        const updatedTrack: Track = {
          id: this.currentTrackId,
          ...trackData,
          addedDate: new Date(),
          audioFile: this.audioFile,
          fileUrl: this.audioFile ? URL.createObjectURL(this.audioFile) : '',
        };

        this.trackService.updateTrack(updatedTrack).subscribe(() => {
          this.store.dispatch(
            TrackActions.updateTrackSuccess({ track: updatedTrack })
          );
          this.router.navigate(['/library']);
        });
      } else {
        const newTrack: Track = {
          id: Date.now().toString(),
          ...trackData,
          addedDate: new Date(),
          audioFile: this.audioFile,
          fileUrl: this.audioFile ? URL.createObjectURL(this.audioFile) : '',
        };

        this.storageService
          .addTrack(newTrack, this.audioFile!)
          .subscribe(() => {
            this.store.dispatch(TrackActions.addTrack({ track: newTrack }));
            this.router.navigate(['/library']);
          });
      }
    }
  }
}
