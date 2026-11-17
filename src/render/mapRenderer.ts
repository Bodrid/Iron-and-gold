// Draws the tile map with one full-screen WebGL2 pass: terrain, country colours, borders, occupation stripes, selection.
import { RIVER_BIT, Terrain, TERRAIN_MASK, type MapData } from '../map/format';
import type { Camera } from './camera';
import { dirtyRowBand } from './camera';
import { compile, texture } from './gl';
import { PALETTE_SIZE } from './palette';
import { FRAG, VERT } from './shaders';

const TERRAIN_RGB: Record<number, [number, number, number]> = {
  [Terrain.Sea]: [29, 58, 82], [Terrain.Lake]: [52, 96, 130], [Terrain.Plains]: [186, 196, 140], [Terrain.Forest]: [104, 140, 84],
  [Terrain.Hills]: [168, 152, 112], [Terrain.Mountains]: [132, 120, 108], [Terrain.Desert]: [222, 204, 150],
};

export function terrainColours(map: MapData): Uint8Array {
  const out = new Uint8Array(map.width * map.height * 4);
  for (let i = 0; i < map.terrain.length; i++) {
    const b = map.terrain[i];
    const c = TERRAIN_RGB[b & TERRAIN_MASK] ?? [255, 0, 255];
    const x = i % map.width, y = (i / map.width) | 0;
    const n = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 13) - 6;
    let [r, g, bl] = c;
    if ((b & TERRAIN_MASK) >= Terrain.Plains) { r += n; g += n; bl += n; }
    if (b & RIVER_BIT) { r = r * 0.6 + 60 * 0.4; g = g * 0.6 + 120 * 0.4; bl = bl * 0.6 + 190 * 0.4; }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = bl; out[i * 4 + 3] = 255;
  }
  return out;
}

export class MapRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private ownerData: Uint8Array;
  private ownerTex: WebGLTexture;
  private paletteTex: WebGLTexture;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private selected = -1;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement, private map: MapData) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('This device does not support WebGL2.');
    this.gl = gl;
    this.prog = compile(gl, VERT, FRAG);
    gl.useProgram(this.prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uTerrain', 'uOwner', 'uStates', 'uPalette', 'uCenter', 'uView', 'uZoom', 'uMap', 'uSelected']) this.u[n] = gl.getUniformLocation(this.prog, n);
    const { width: w, height: h } = map;
    texture(gl, 0, w, h, gl.RGBA, gl.RGBA8, terrainColours(map));
    this.ownerData = new Uint8Array(w * h * 4);
    this.ownerTex = texture(gl, 1, w, h, gl.RGBA, gl.RGBA8, this.ownerData);
    const st = new Uint8Array(w * h * 2);
    for (let i = 0; i < map.stateOf.length; i++) { st[i * 2] = map.stateOf[i] & 255; st[i * 2 + 1] = map.stateOf[i] >> 8; }
    texture(gl, 2, w, h, gl.RG, gl.RG8, st);
    this.paletteTex = texture(gl, 3, PALETTE_SIZE, 1, gl.RGBA, gl.RGBA8, new Uint8Array(PALETTE_SIZE * 4));
    gl.uniform1i(this.u.uTerrain, 0); gl.uniform1i(this.u.uOwner, 1); gl.uniform1i(this.u.uStates, 2); gl.uniform1i(this.u.uPalette, 3);
    gl.uniform2i(this.u.uMap, w, h);
  }

  setOwnership(owner: Uint16Array, controller: Uint16Array): void {
    const d = this.ownerData;
    for (let i = 0; i < owner.length; i++) { d[i * 4] = owner[i] & 255; d[i * 4 + 1] = owner[i] >> 8; d[i * 4 + 2] = controller[i] & 255; d[i * 4 + 3] = controller[i] >> 8; }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ownerTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.map.width, this.map.height, gl.RGBA, gl.UNSIGNED_BYTE, d);
  }

  applyTiles(idx: Uint32Array, val: Uint32Array): void {
    const band = dirtyRowBand(idx, this.map.width);
    if (!band) return;
    const d = this.ownerData;
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k], v = val[k], o = v & 0xffff, c = v >>> 16;
      d[i * 4] = o & 255; d[i * 4 + 1] = o >> 8; d[i * 4 + 2] = c & 255; d[i * 4 + 3] = c >> 8;
    }
    const gl = this.gl;
    const w = this.map.width;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ownerTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, band[0], w, band[1] - band[0] + 1, gl.RGBA, gl.UNSIGNED_BYTE, d.subarray(band[0] * w * 4, (band[1] + 1) * w * 4));
  }

  setPalette(p: Uint8Array): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PALETTE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
  }

  setSelectedState(id: number | null): void { this.selected = id ?? -1; }

  resize(w: number, h: number, dpr: number): void {
    this.dpr = Math.min(2, dpr);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(cam: Camera): void {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.uCenter, cam.x, cam.y);
    gl.uniform2f(this.u.uView, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uZoom, cam.zoom * (this.canvas.width / Math.max(1, cam.viewW)));
    gl.uniform1i(this.u.uSelected, this.selected);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /** For tests: distinct colours at n points across the canvas. */
  sampleColours(n: number, cam: Camera): number {
    this.render(cam);
    const gl = this.gl;
    const seen = new Set<string>();
    const px = new Uint8Array(4);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(((k % 8) + 0.5) / 8 * this.canvas.width), y = Math.floor((Math.floor(k / 8) + 0.5) / Math.ceil(n / 8) * this.canvas.height);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      seen.add(`${px[0] >> 3},${px[1] >> 3},${px[2] >> 3}`);
    }
    return seen.size;
  }
}
