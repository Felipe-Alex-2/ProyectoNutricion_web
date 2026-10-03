import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../core/services/appointment.service';
import { Appointment } from '../../core/models/appointment.model';

@Component({
  selector: 'app-modal-cancelar-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-cancelar-cita.component.html',
  styleUrls: ['./modal-cancelar-cita.component.css'],
})
export class ModalCancelarCitaComponent {
  @Input() isOpen: boolean = false;
  @Input() appointment: Appointment | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<Appointment>();

  cancelReason = signal<string>('');
  isCancelling = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(public appointmentService: AppointmentService) {}

  confirmarCancelacion(): void {
    if (!this.appointment) return;
    const appt = this.appointment;
    this.isCancelling.set(true);
    this.errorMessage.set(null);

    this.appointmentService.cancelAppointment(appt.id, this.cancelReason()).subscribe({
      next: (res: Appointment) => {
        this.isCancelling.set(false);
        this.cancelReason.set('');
        this.cancelled.emit(res || appt);
        this.cerrar();
      },
      error: (err: any) => {
        this.isCancelling.set(false);
        this.errorMessage.set(err?.error?.detail || 'Error al cancelar la cita');
      },
    });
  }

  cerrar(): void {
    this.cancelReason.set('');
    this.errorMessage.set(null);
    this.closed.emit();
  }
}
