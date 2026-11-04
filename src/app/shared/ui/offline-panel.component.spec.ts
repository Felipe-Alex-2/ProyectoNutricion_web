import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { OfflinePanelComponent } from './offline-panel.component';
import { OfflineService } from '../../core/services/offline.service';

describe('Offline notice and numbered operations', () => {
  it('opens the numbered list and displays offline status without a click', () => {
    TestBed.configureTestingModule({
      imports: [OfflinePanelComponent],
      providers: [
        {
          provide: OfflineService,
          useValue: {
            store: {
              offline: signal(true),
              pending: signal([
                {
                  id: '1',
                  url: '/recipes',
                  body: { title: 'Sopa' },
                  created: '2026-11-03T10:00:00Z',
                },
                {
                  id: '2',
                  url: '/payments/create',
                  body: { customer_name: 'Cliente', amount: 5 },
                  created: '2026-11-03T10:01:00Z',
                },
              ]),
            },
            lastCopy: signal(null),
            copying: signal(false),
            syncing: signal(false),
            message: signal(''),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(OfflinePanelComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Modo offline · Sin conexión');
    expect(element.textContent).toContain('2 operaciones pendientes');
    expect(element.querySelector('details')?.open).toBe(true);
    expect(element.querySelectorAll('ol > li').length).toBe(2);
  });
});
