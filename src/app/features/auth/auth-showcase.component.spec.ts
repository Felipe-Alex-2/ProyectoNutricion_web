import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthShowcaseComponent } from './auth-showcase.component';

describe('Nutrition authentication carousel', () => {
  let fixture: ComponentFixture<AuthShowcaseComponent> | undefined;
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AuthShowcaseComponent] }).compileComponents();
    vi.useFakeTimers();
    media.matches = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function render() {
    fixture = TestBed.createComponent(AuthShowcaseComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  it('cycles through three scenes every ten seconds and clears its timer on navigation', () => {
    const component = render();
    vi.advanceTimersByTime(9999);
    expect(component.activeSlide()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(component.activeSlide()).toBe(1);
    vi.advanceTimersByTime(20000);
    expect(component.activeSlide()).toBe(0);
    fixture!.destroy();
    fixture = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('pauses on user interaction and exposes manual navigation', () => {
    const component = render();
    component.focused.set(true);
    vi.advanceTimersByTime(10000);
    expect(component.activeSlide()).toBe(0);
    component.focused.set(false);
    component.hovered.set(true);
    vi.advanceTimersByTime(10000);
    expect(component.activeSlide()).toBe(0);
    component.hovered.set(false);
    fixture!.nativeElement.querySelector('[aria-label="Pausar carrusel"]').click();
    vi.advanceTimersByTime(10000);
    expect(component.activeSlide()).toBe(0);
    fixture!.nativeElement.querySelector('[aria-label="Imagen siguiente"]').click();
    expect(component.activeSlide()).toBe(1);
    fixture!.detectChanges();
    expect(fixture!.nativeElement.querySelector('[aria-label="Reproducir carrusel"]')).toBeTruthy();
  });
  it('starts paused when the device requests reduced motion', () => {
    media.matches = true;
    const component = render();
    vi.advanceTimersByTime(30000);
    expect(component.paused()).toBe(true);
    expect(component.activeSlide()).toBe(0);
  });
});
