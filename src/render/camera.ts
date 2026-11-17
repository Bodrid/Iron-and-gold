// The view onto the map: centre tile and zoom (screen pixels per tile), clamped so the map always fills the view.
export const MAX_ZOOM = 32;

export class Camera {
  x: number; y: number; zoom: number;
  constructor(private mapW: number, private mapH: number, public viewW: number, public viewH: number) {
    this.zoom = this.minZoom();
    this.x = mapW / 2;
    this.y = mapH / 2;
    this.clamp();
  }

  minZoom(): number { return Math.max(this.viewH / this.mapH, this.viewW / this.mapW / 2.5); }

  resize(viewW: number, viewH: number): void {
    this.viewW = viewW; this.viewH = viewH;
    this.clamp();
  }

  screenToTile(px: number, py: number): [number, number] {
    return [this.x + (px - this.viewW / 2) / this.zoom, this.y + (py - this.viewH / 2) / this.zoom];
  }

  tileToScreen(tx: number, ty: number): [number, number] {
    return [(tx - this.x) * this.zoom + this.viewW / 2, (ty - this.y) * this.zoom + this.viewH / 2];
  }

  pan(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  zoomAt(px: number, py: number, factor: number): void {
    const [tx, ty] = this.screenToTile(px, py);
    this.zoom = Math.min(MAX_ZOOM, Math.max(this.minZoom(), this.zoom * factor));
    this.x = tx - (px - this.viewW / 2) / this.zoom;
    this.y = ty - (py - this.viewH / 2) / this.zoom;
    this.clamp();
  }

  flyTo(tx: number, ty: number, zoom?: number): void {
    if (zoom !== undefined) this.zoom = Math.min(MAX_ZOOM, Math.max(this.minZoom(), zoom));
    this.x = tx; this.y = ty;
    this.clamp();
  }

  clamp(): void {
    this.zoom = Math.min(MAX_ZOOM, Math.max(this.minZoom(), this.zoom));
    const hw = this.viewW / 2 / this.zoom, hh = this.viewH / 2 / this.zoom;
    this.x = this.mapW <= hw * 2 ? this.mapW / 2 : Math.min(this.mapW - hw, Math.max(hw, this.x));
    this.y = this.mapH <= hh * 2 ? this.mapH / 2 : Math.min(this.mapH - hh, Math.max(hh, this.y));
  }
}

/** First and last map row touched by a batch of tile updates. */
export function dirtyRowBand(idx: Uint32Array, width: number): [number, number] | null {
  if (!idx.length) return null;
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < idx.length; k++) { const r = Math.floor(idx[k] / width); if (r < lo) lo = r; if (r > hi) hi = r; }
  return [lo, hi];
}
