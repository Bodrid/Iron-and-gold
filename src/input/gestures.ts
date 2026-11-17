// Turns raw pointer events into map gestures: tap, long press, pan, pinch.
export type PointerSample = { id: number; x: number; y: number; t: number; kind: 'down' | 'move' | 'up' | 'cancel'; button?: number };
export type Gesture =
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'pinch'; cx: number; cy: number; scale: number }
  | { type: 'tap'; x: number; y: number }
  | { type: 'longPress'; x: number; y: number };

const TAP_MOVE = 10, TAP_MS = 300, LONG_MS = 500;

export class GestureRecognizer {
  private pts = new Map<number, { x: number; y: number }>();
  private start: { x: number; y: number; t: number } | null = null;
  private moved = false;
  private multi = false;
  private longFired = false;
  private lastDist = 0;
  private lastMid = { x: 0, y: 0 };

  feed(s: PointerSample): Gesture[] {
    const out: Gesture[] = [];
    if (s.kind === 'down') {
      this.pts.set(s.id, { x: s.x, y: s.y });
      if (this.pts.size === 1) { this.start = { x: s.x, y: s.y, t: s.t }; this.moved = false; this.multi = false; this.longFired = false; }
      else { this.multi = true; this.resetPinch(); }
      return out;
    }
    const p = this.pts.get(s.id);
    if (!p) return out;
    if (s.kind === 'move') {
      if (this.pts.size >= 2) {
        p.x = s.x; p.y = s.y;
        const [a, b] = [...this.pts.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (this.lastDist > 0) out.push({ type: 'pinch', cx: mid.x, cy: mid.y, scale: dist / this.lastDist });
        out.push({ type: 'pan', dx: mid.x - this.lastMid.x, dy: mid.y - this.lastMid.y });
        this.lastDist = dist; this.lastMid = mid;
        return out.filter(g => g.type !== 'pan' || g.dx || g.dy);
      }
      const dx = s.x - p.x, dy = s.y - p.y;
      p.x = s.x; p.y = s.y;
      if (this.start && Math.hypot(s.x - this.start.x, s.y - this.start.y) >= TAP_MOVE) this.moved = true;
      if (this.moved && !this.longFired) out.push({ type: 'pan', dx, dy });
      return out;
    }
    // up / cancel
    this.pts.delete(s.id);
    if (this.pts.size === 1) { this.resetPinch(); return out; }
    if (this.pts.size === 0) {
      const st = this.start;
      if (s.kind === 'up' && st && !this.moved && !this.multi && !this.longFired && s.t - st.t < TAP_MS) out.push({ type: 'tap', x: s.x, y: s.y });
      this.start = null;
    }
    return out;
  }

  /** Call regularly with the current time; fires a long press once. */
  tick(t: number): Gesture[] {
    if (this.start && this.pts.size === 1 && !this.moved && !this.multi && !this.longFired && t - this.start.t >= LONG_MS) {
      this.longFired = true;
      return [{ type: 'longPress', x: this.start.x, y: this.start.y }];
    }
    return [];
  }

  private resetPinch() {
    const v = [...this.pts.values()];
    if (v.length >= 2) { this.lastDist = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); this.lastMid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 }; }
    else if (v.length === 1) { this.lastDist = 0; this.start = null; this.moved = true; }
  }
}
