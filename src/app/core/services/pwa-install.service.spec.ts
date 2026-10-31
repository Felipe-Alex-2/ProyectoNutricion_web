import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';

describe('NutriSalud installation', () => {
  afterEach(() => TestBed.resetTestingModule());

  function offer(outcome: 'accepted' | 'dismissed' = 'accepted') {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    const prompt = vi.fn().mockResolvedValue(undefined);
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
    window.dispatchEvent(event);
    return { event, prompt };
  }

  it('offers the browser prompt once and hides after installation', async () => {
    const service = TestBed.inject(PwaInstallService);
    expect(service.visible()).toBe(false);
    const { event, prompt } = offer();
    expect(event.defaultPrevented).toBe(true);
    expect(service.visible()).toBe(true);
    await service.install();
    await service.install();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(service.installed()).toBe(true);
    expect(service.visible()).toBe(false);
  });

  it('does not claim installation when the user declines', async () => {
    const service = TestBed.inject(PwaInstallService);
    offer('dismissed');
    await service.install();
    expect(service.installed()).toBe(false);
    expect(service.canInstall()).toBe(false);
    expect(service.installing()).toBe(false);
  });

  it('respects dismissal and external app installation', () => {
    const service = TestBed.inject(PwaInstallService);
    offer();
    service.dismiss();
    expect(service.visible()).toBe(false);
    window.dispatchEvent(new Event('appinstalled'));
    expect(service.installed()).toBe(true);
  });

  it('recovers when the browser cannot show the install dialog', async () => {
    const service = TestBed.inject(PwaInstallService);
    const { prompt } = offer();
    prompt.mockRejectedValue(new Error('unavailable'));
    await service.install();
    expect(service.installing()).toBe(false);
    expect(service.installed()).toBe(false);
    expect(service.error()).toContain('menú del navegador');
  });
});
