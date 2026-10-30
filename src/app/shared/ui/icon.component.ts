import { Component, input } from '@angular/core';

@Component({
  selector: 'ns-icon',
  standalone: true,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] || paths['leaf']" />
  </svg>`,
  styles: [
    ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  name = input('leaf');
  readonly paths: Record<string, string> = {
    back: 'M19 12H5m6-6-6 6 6 6',
    email: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
    lock: 'M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4m-4 4v3',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    pause: 'M8 5v14M16 5v14',
    minus: 'M5 12h14',
    chevron: 'm6 9 6 6 6-6',
    building: 'M5 21V3h14v18M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3',
    play: 'm8 4 12 8-12 8V4Z',
    leaf: 'M20 4C9 2 2 8 6 15s16 3 14-11ZM6 19 16 9M9 15v-4m4 0h4',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    plus: 'M12 5v14M5 12h14',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4',
    calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 14h2m4 0h2m-8 3h2',
    users:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    chart: 'M4 3v17h17M8 16v-5m5 5V7m5 9v-8',
    wallet: 'M3 6h17v14H3V6Zm0 0V4l15-2v4m-2 6h5v5h-5z',
    shield: 'm12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6l8-4Zm-4 10 3 3 5-6',
    sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
    check: 'm5 12 4 4L19 6',
    file: 'M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6',
    camera: 'M3 6h5l2-3h4l2 3h5v15H3V6Zm9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    chat: 'M21 3H3v14h5v4l5-4h8V3ZM7 8h10M7 12h6',
    logout: 'M9 3H3v18h6m5-15 6 6-6 6m-7-6h13',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
    link: 'm10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'm6 6 12 12M6 18 18 6',
  };
}
