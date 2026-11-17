// Country names and building icons, drawn on a 2D canvas above the map.
import { BUILDINGS } from '../content/buildings';
import type { BuildingIcon, Label } from '../sim/types';
import type { CountrySummary } from '../worker/protocol';
import type { Camera } from './camera';

export const ICON_MIN_ZOOM = 6;
export const SHIP_MIN_ZOOM = 1.5;

export function visibleIcons(icons: BuildingIcon[], cam: Camera, minZoom = ICON_MIN_ZOOM, mapW = 2400): BuildingIcon[] {
  if (cam.zoom < minZoom) return [];
  const [x0, y0] = cam.screenToTile(0, 0), [x1, y1] = cam.screenToTile(cam.viewW, cam.viewH);
  return icons.filter(i => { const x = i.tile % mapW, y = Math.floor(i.tile / mapW); return x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1; });
}

const CATEGORY_COLOUR: Record<string, string> = { production: '#8fd16a', industry: '#e5b54a', military: '#e5534b', infrastructure: '#7cc4ff', knowledge: '#c9a0ff' };

export class Overlay {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  constructor(private canvas: HTMLCanvasElement, private mapW: number) { this.ctx = canvas.getContext('2d')!; }

  resize(w: number, h: number, dpr: number) {
    this.dpr = Math.min(2, dpr);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  draw(cam: Camera, labels: Label[], icons: BuildingIcon[], playerId: number, ships: Int32Array = new Int32Array(0), countries: CountrySummary[] = []): void {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, cam.viewW, cam.viewH);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    for (const l of labels) {
      const px = l.size * cam.zoom;
      if (px < 9) continue;
      const [x, y] = cam.tileToScreen(l.x, l.y);
      if (x < -300 || y < -100 || x > cam.viewW + 300 || y > cam.viewH + 100) continue;
      const fontPx = Math.min(px, 34);
      g.font = `700 ${fontPx}px -apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif`;
      g.lineWidth = Math.max(2, fontPx / 7);
      g.strokeStyle = 'rgba(10,16,24,0.85)';
      g.fillStyle = l.country === playerId ? '#ffe9a8' : '#ffffff';
      const text = l.text.toUpperCase();
      g.strokeText(text, x, y);
      g.fillText(text, x, y);
    }
    this.drawShips(cam, ships, countries, playerId);
    const vis = visibleIcons(icons, cam, ICON_MIN_ZOOM, this.mapW);
    const s = Math.min(26, cam.zoom * 1.6);
    for (const i of vis) {
      const [x, y] = cam.tileToScreen((i.tile % this.mapW) + 0.5, Math.floor(i.tile / this.mapW) + 0.5);
      const def = BUILDINGS[i.type];
      g.fillStyle = 'rgba(16,22,31,0.9)';
      g.strokeStyle = i.owner === playerId ? '#ffe9a8' : 'rgba(255,255,255,0.7)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(x - s / 2, y - s / 2, s, s, s * 0.22);
      g.fill(); g.stroke();
      g.fillStyle = CATEGORY_COLOUR[def.category];
      g.font = `700 ${s * 0.5}px -apple-system, system-ui, sans-serif`;
      g.fillText(def.name[0], x, y + 0.5);
      if (i.level > 1 && s >= 14) {
        g.fillStyle = '#fff';
        g.font = `600 ${s * 0.36}px -apple-system, system-ui, sans-serif`;
        g.fillText(String(i.level), x + s * 0.42, y + s * 0.42);
      }
    }
  }

  private drawShips(cam: Camera, ships: Int32Array, countries: CountrySummary[], playerId: number) {
    if (cam.zoom < SHIP_MIN_ZOOM || !ships.length) return;
    const g = this.ctx;
    const colour = new Map(countries.map(c => [c.id, `#${c.color.toString(16).padStart(6, '0')}`]));
    const r = Math.max(2.5, Math.min(9, cam.zoom * 1.2));
    for (let k = 0; k + 4 < ships.length; k += 5) {
      const owner = ships[k + 1], kind = ships[k + 2];
      const [x, y] = cam.tileToScreen(ships[k + 3] / 16, ships[k + 4] / 16);
      if (x < -20 || y < -20 || x > cam.viewW + 20 || y > cam.viewH + 20) continue;
      g.lineWidth = owner === playerId ? 2 : 1.2;
      g.strokeStyle = owner === playerId ? '#ffe9a8' : 'rgba(10,16,24,0.9)';
      g.fillStyle = kind === 0 ? '#f4efe1' : colour.get(owner) ?? '#ccc';
      g.beginPath();
      if (kind === 0) g.arc(x, y, r * 0.6, 0, 6.2832);
      else if (kind === 1) { g.moveTo(x, y - r); g.lineTo(x + r * 0.9, y + r * 0.7); g.lineTo(x - r * 0.9, y + r * 0.7); g.closePath(); }
      else g.rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
      g.fill(); g.stroke();
    }
  }
}
