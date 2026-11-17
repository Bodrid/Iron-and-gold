import { it, expect } from 'vitest';
import { visibleIcons } from './overlay';
import { Camera } from './camera';

it('hides icons when zoomed out and keeps only those in view', () => {
  const cam = new Camera(2400, 907, 874, 402);
  const icons = [{ type: 'farm' as const, tile: 450 * 2400 + 1200, level: 1, owner: 1 }, { type: 'farm' as const, tile: 10, level: 1, owner: 1 }];
  expect(visibleIcons(icons, cam)).toEqual([]);
  cam.flyTo(1200, 450, 8);
  expect(visibleIcons(icons, cam).map(i => i.tile)).toEqual([450 * 2400 + 1200]);
});
