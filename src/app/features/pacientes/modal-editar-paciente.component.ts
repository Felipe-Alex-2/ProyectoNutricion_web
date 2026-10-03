import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../core/services/patient.service';
import { PatientListItem } from '../../core/models/user.model';

@Component({
  selector: 'app-modal-editar-paciente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-editar-paciente.component.html',
  styleUrls: ['./modal-editar-paciente.component.css'],
})
export class ModalEditarPacienteComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() patient: PatientListItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  patientForm: FormGroup;
  errorMessage: string | null = null;
  isSaving: boolean = false;

  constructor(
    private fb: FormBuilder,
    public patientService: PatientService
  ) {
    this.patientForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      is_active: [true],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patient'] && this.patient) {
      this.patientForm.patchValue({
        full_name: this.patient.full_name || '',
        email: this.patient.email || '',
        phone: this.patient.phone || '',
        is_active: this.patient.is_active,
      });
      this.errorMessage = null;
    }
  }

  guardar(): void {
    if (this.patientForm.invalid || !this.patient) return;
    this.isSaving = true;
    this.errorMessage = null;

    this.patientService.updatePatient(this.patient.id, this.patientForm.value).subscribe({
      next: () => {
        this.isSaving = false;
        this.saved.emit();
        this.cerrar();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorMessage = err?.error?.detail || 'Error al actualizar el cliente';
      },
    });
  }

  cerrar(): void {
    this.closed.emit();
  }
}
