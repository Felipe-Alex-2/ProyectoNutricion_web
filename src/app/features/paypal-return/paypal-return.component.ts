import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-paypal-return',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="paypal-return-container">
      <div class="paypal-return-card">
        @if (loading()) {
          <div class="return-icon loading-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
          <h2>Procesando tu pago...</h2>
          <p class="text-secondary">Estamos confirmando la transacción con PayPal Sandbox. Por favor espera un momento.</p>
        }
        @if (success()) {
          <div class="return-icon success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2>¡Cobro Exitoso!</h2>
          <p class="text-secondary">{{ successDetail() || 'El pago fue procesado y registrado en la caja de la sucursal.' }}</p>
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.5rem;">Serás redirigido al panel en unos segundos...</p>
        }
        @if (errorMsg()) {
          <div class="return-icon error-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2>Error al capturar el pago</h2>
          <p class="text-secondary">{{ errorMsg() }}</p>
          <button class="btn-return" (click)="goToDashboard()">Volver a la Caja</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .paypal-return-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary, #f8fafc);
      padding: 2rem;
    }
    .paypal-return-card {
      background: var(--bg-card, #ffffff);
      border-radius: 16px;
      padding: 3rem;
      text-align: center;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .return-icon {
      margin-bottom: 1.5rem;
    }
    .loading-icon { color: var(--color-primary, #2563eb); }
    .success-icon { color: #10b981; }
    .error-icon { color: #ef4444; }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary, #1e293b);
    }
    .text-secondary {
      color: var(--text-secondary, #64748b);
      font-size: 0.95rem;
      margin: 0;
    }
    .btn-return {
      margin-top: 1.5rem;
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 8px;
      background: var(--color-primary, #2563eb);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
      transition: opacity 0.2s;
    }
    .btn-return:hover { opacity: 0.85; }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
})
export class PaypalReturnComponent implements OnInit {
  loading = signal(true);
  success = signal(false);
  successDetail = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    // PayPal redirects back with ?token=ORDER_ID
    const orderId = this.route.snapshot.queryParamMap.get('token');

    if (!orderId) {
      this.loading.set(false);
      this.errorMsg.set('No se recibió un identificador de orden de PayPal.');
      return;
    }

    // Try capturing client POS payment first
    this.paymentService.capturePayment(orderId).subscribe({
      next: (payment) => {
        this.loading.set(false);
        this.success.set(true);
        this.successDetail.set(
          `Cobro de $${payment.amount} ${payment.currency} por "${payment.concept}" (${payment.customer_name}) confirmado exitosamente.`
        );
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 3000);
      },
      error: () => {
        // Fallback to subscription service in case it was a subscription
        this.subscriptionService.captureOrder(orderId).subscribe({
          next: () => {
            this.loading.set(false);
            this.success.set(true);
            this.successDetail.set('Suscripción activada exitosamente.');
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          },
          error: (subErr) => {
            this.loading.set(false);
            this.errorMsg.set(
              subErr?.error?.detail || 'Ocurrió un error al procesar el pago con PayPal.'
            );
          },
        });
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

