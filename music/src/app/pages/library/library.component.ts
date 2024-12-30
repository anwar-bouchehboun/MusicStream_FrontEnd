import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Track } from '../../models/track.interface';
import { TrackActions, PlayerActions } from '../../store/actions/track.actions';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TrackService } from '../../services/track.service';
import { FormatDurationPipe } from '../../shared/pipes/format-duration.pipe';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormatDurationPipe,
    HttpClientModule,
  ],
  providers: [TrackService],
  templateUrl: './library.component.html',
  styles: [
    `
      .track-card {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      mat-card-actions {
        margin-top: auto;
        padding: 8px;
      }
    `,
  ],
})
export class LibraryComponent implements OnInit {
  tracks$ = this.trackService.getAllTracks();
  searchQuery = '';

  constructor(
    private store: Store<any>,
    private trackService: TrackService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTracks();
  }
  loadTracks() {
    this.trackService.getAllTracks().subscribe((tracks) => {
      this.store.dispatch(TrackActions.loadTracksSuccess({ tracks }));
    });
  }

  onSearch() {
    // Implémenter la logique de recherche
  }

  playTrack(track: Track) {
    this.store.dispatch(PlayerActions['play']({ track }));
  }

  editTrack(track: Track) {
    this.router.navigate(['/edit-track', track.id]);
  }

  deleteTrack(track: Track): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette piste ?')) {
      this.trackService.deleteTrack(track.id).subscribe({
        next: () => {
          this.tracks$ = this.trackService.getAllTracks();
          this.store.dispatch(TrackActions.deleteTrack({ id: track.id }));
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Une erreur est survenue lors de la suppression de la piste');
        },
      });
    }
  }
}
