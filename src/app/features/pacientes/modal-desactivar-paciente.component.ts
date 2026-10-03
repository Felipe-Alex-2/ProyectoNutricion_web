import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../core/services/patient.service';
import { PatientListItem } from '../../core/models/user.model';

@Component({
  selector: 'app-modal-desactivar-paciente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-desactivar-paciente.component.html',
  styleUrls: ['./modal-desactivar-paciente.component.css'],
})
export class ModalDesactivarPacienteComponent {
  @Input() isOpen: boolean = false;
  @Input() patient: PatientListItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() deactivated = new EventEmitter<string>();

  isProcessing: boolean = false;
  errorMessage: string | null = null;

  constructor(public patientService: PatientService) {}

  confirmar(): void {
    if (!this.patient) return;
    const name = this.patient.full_name;
    this.isProcessing = true;
    this.errorMessage = null;

    this.patientService.deletePatient(this.patient.id).subscribe({
      next: () => {
        this.isProcessing = false;
        this.deactivated.emit(name);
        this.cerrar();
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.errorMessage = err?.error?.detail || 'Error al desactivar el cliente';
      },
    });
  }

  cerrar(): void {
    this.closed.emit();
  }
}
