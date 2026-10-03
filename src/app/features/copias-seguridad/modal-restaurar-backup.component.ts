import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackupService } from '../../core/services/backup.service';

@Component({
  selector: 'app-modal-restaurar-backup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-restaurar-backup.component.html',
  styleUrls: ['./modal-restaurar-backup.component.css'],
})
export class ModalRestaurarBackupComponent {
  @Input() isOpen: boolean = false;
  @Input() restoreFile: File | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() restored = new EventEmitter<string>();

  isRestoring = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(public backupService: BackupService) {}

  confirmarRestauracion(): void {
    if (!this.restoreFile) return;
    this.isRestoring.set(true);
    this.errorMessage.set(null);

    this.backupService.restoreBackup(this.restoreFile).subscribe({
      next: (res) => {
        this.isRestoring.set(false);
        this.restored.emit(res.message);
        this.cerrar();
      },
      error: (err: any) => {
        this.isRestoring.set(false);
        this.errorMessage = err?.error?.detail || 'Error durante la restauración del sistema';
      },
    });
  }

  cerrar(): void {
    this.errorMessage.set(null);
    this.closed.emit();
  }
}
