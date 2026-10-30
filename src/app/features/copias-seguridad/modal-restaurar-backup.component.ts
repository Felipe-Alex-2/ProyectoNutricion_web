import { Component, EventEmitter, Input, Output, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackupService, BackupPreview } from '../../core/services/backup.service';
@Component({
  selector: 'app-modal-restaurar-backup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-restaurar-backup.component.html',
  styleUrls: ['./modal-restaurar-backup.component.css'],
})
export class ModalRestaurarBackupComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() restoreFile: File | null = null;
  @Input() tenantId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() restored = new EventEmitter<string>();
  isRestoring = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  preview = signal<BackupPreview | null>(null);
  password = '';
  private revision = 0;
  constructor(public backupService: BackupService) {}
  ngOnChanges(): void {
    this.password = '';
    this.preview.set(null);
    this.revision++;
    if (this.isOpen && this.restoreFile) this.analyze();
  }
  analyze(): void {
    if (!this.restoreFile || !this.tenantId) {
      this.errorMessage.set('Selecciona la empresa antes de cargar el respaldo.');
      return;
    }
    const revision = ++this.revision;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.preview.set(null);
    this.backupService.previewBackup(this.restoreFile, this.tenantId).subscribe({
      next: (p) => {
        if (revision !== this.revision) return;
        this.preview.set(p);
        this.loading.set(false);
      },
      error: (e) => {
        if (revision !== this.revision) return;
        this.loading.set(false);
        this.errorMessage.set(e?.error?.detail || 'No se pudo analizar el archivo.');
      },
    });
  }
  confirmarRestauracion(): void {
    const review = this.preview();
    if (!this.restoreFile || !review || !this.password || !review.missing || this.isRestoring())
      return;
    this.isRestoring.set(true);
    this.errorMessage.set(null);
    this.backupService
      .restoreBackup(this.restoreFile, this.password, review.review_token, this.tenantId)
      .subscribe({
        next: (r) => {
          this.isRestoring.set(false);
          this.password = '';
          this.restored.emit(r.message);
          this.cerrar();
        },
        error: (e) => {
          this.isRestoring.set(false);
          this.password = '';
          this.errorMessage.set(
            e?.error?.detail || 'No se pudo restaurar. Vuelve a analizar el archivo.',
          );
        },
      });
  }
  cerrar(): void {
    if (this.isRestoring()) return;
    this.revision++;
    this.password = '';
    this.closed.emit();
  }
}
