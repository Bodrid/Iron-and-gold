// Scanline polygon fill (even-odd, sampled at tile centres) and polyline drawing on a tile grid.
type Grid = Uint8Array | Uint16Array;

export function fillPolygon(grid: Grid, w: number, h: number, rings: number[][][], value: number): void {
  let minY = Infinity, maxY = -Infinity;
  for (const r of rings) for (const p of r) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  const y0 = Math.max(0, Math.floor(minY - 0.5)), y1 = Math.min(h - 1, Math.ceil(maxY));
  const xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    xs.length = 0;
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [ax, ay] = r[j], [bx, by] = r[i];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5)), to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) grid[y * w + x] = value;
    }
  }
}

export function drawPolyline(grid: Uint8Array, w: number, h: number, line: number[][], bit: number): void {
  for (let i = 0; i + 1 < line.length; i++) {
    let x0 = Math.floor(line[i][0]), y0 = Math.floor(line[i][1]);
    const x1 = Math.floor(line[i + 1][0]), y1 = Math.floor(line[i + 1][1]);
    if (Math.abs(x1 - x0) > w * 0.95) continue; // segment wraps the antimeridian
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (x0 >= 0 && y0 >= 0 && x0 < w && y0 < h) grid[y0 * w + x0] |= bit;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
}

/** Polygon / MultiPolygon rings projected to tile coordinates. */
export function projectRings(geometry: any, toTileF: (lon: number, lat: number) => [number, number]): number[][][][] {
  const polys: number[][][][] = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polys.map(rings => rings.map(r => r.map(([lon, lat]) => toTileF(lon, lat))));
}

export function projectLines(geometry: any, toTileF: (lon: number, lat: number) => [number, number]): number[][][] {
  const lines: number[][][] = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.type === 'MultiLineString' ? geometry.coordinates : [];
  return lines.map(l => l.map(([lon, lat]) => toTileF(lon, lat)));
}
