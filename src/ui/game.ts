// Runs a game on the main thread: worker messages → map, overlay and UI state; taps → selection.
import type { MapData } from '../map/format';
import { Camera } from '../render/camera';
import { MapRenderer } from '../render/mapRenderer';
import { Overlay } from '../render/overlay';
import { buildPalette } from '../render/palette';
import { attachInput } from '../input/attach';
import { keyAction } from '../input/keyboard';
import type { BuildingIcon, Command, Label, SimEvent } from '../sim/types';
import type { GameHost } from '../worker/host';
import type { FrameMsg, ReadyMsg } from '../worker/protocol';
import { haptic } from './haptics';
import { country, layoutFor, pushToast, ui, type Tab } from './store';
import { BUILDING_NAMES } from '../worker/summaries';
import { cellIndex } from '../sim/naval/nav';

export class GameController {
  private owner: Uint16Array;
  private controller: Uint16Array;
  private labels: Label[];
  private icons: BuildingIcon[];
  private cam: Camera;
  private renderer: MapRenderer | null = null;
  private overlay: Overlay | null = null;
  private dirty = true;
  private raf = 0;
  private cleanups: (() => void)[] = [];
  private paletteKey = '';

  constructor(public host: GameHost, public map: MapData, ready: ReadyMsg) {
    this.owner = ready.owner; this.controller = ready.controller;
    this.labels = ready.labels; this.icons = ready.buildings;
    this.cam = new Camera(map.width, map.height, innerWidth, innerHeight);
    ui.playerId.value = ready.player;
    ui.countries.value = ready.countries;
    ui.date.value = ready.date;
    ui.tick.value = ready.tick;
    ui.speed.value = 0;
    ui.outcome.value = null;
    ui.outcomeDismissed.value = false;
    ui.selectedState.value = null;
    ui.selection.value = null;
    ui.tab.value = null;
    this.cleanups.push(host.onFrame(f => this.onFrame(f)), host.onEvents(e => this.onEvents(e)), host.onMessage(m => {
      if (m.type === 'gameOver') { ui.outcome.value = { kind: m.kind, scores: m.scores }; ui.outcomeDismissed.value = false; }
      else if (m.type === 'error') { ui.speed.value = 0; pushToast({ kind: 'war', sticky: true, text: m.message }); }
    }));
    const cap = ready.countries.find(c => c.id === ready.player)?.capitalState;
    if (cap) { const [x, y] = map.states[cap].centroid; this.cam.flyTo(x, y, 3); }
  }

  mount(container: HTMLElement): void {
    const canvas = document.createElement('canvas');
    const over = document.createElement('canvas');
    for (const c of [canvas, over]) { c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; container.appendChild(c); }
    over.style.pointerEvents = 'none';
    this.renderer = new MapRenderer(canvas, this.map);
    this.overlay = new Overlay(over, this.map.width);
    this.renderer.setOwnership(this.owner, this.controller);
    this.renderer.onRestored = () => { this.dirty = true; };
    this.updatePalette();
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      const [cx, cy] = this.cam.screenToTile(this.cam.viewW / 2, this.cam.viewH / 2);
      this.cam.resize(w, h);
      this.cam.flyTo(cx, cy);
      this.renderer!.resize(w, h, devicePixelRatio);
      this.overlay!.resize(w, h, devicePixelRatio);
      const layout = layoutFor(innerWidth, innerHeight);
      // Holding the phone upright hides the map: pause so nothing happens unseen.
      if (layout === 'rotate' && ui.layout.value !== 'rotate' && ui.speed.value > 0) this.setSpeed(0);
      ui.layout.value = layout;
      this.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    addEventListener('resize', resize);
    resize();
    this.cleanups.push(() => { ro.disconnect(); removeEventListener('resize', resize); });
    this.cleanups.push(attachInput(canvas, this.cam, {
      onTap: t => this.selectTile(t),
      onLongPress: t => { this.selectTile(t); },
      onChange: () => { this.dirty = true; },
    }));
    const onKey = (e: KeyboardEvent) => this.onKey(e);
    addEventListener('keydown', onKey);
    this.cleanups.push(() => removeEventListener('keydown', onKey));
    const loop = () => {
      if (this.dirty && this.renderer && this.overlay) {
        this.dirty = false;
        this.renderer.render(this.cam);
        this.overlay.draw(this.cam, this.labels, this.icons, ui.playerId.value, ui.ships.value, ui.countries.value);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private updatePalette() {
    const key = ui.countries.value.map(c => `${c.id}:${c.color}`).join(',');
    if (key === this.paletteKey || !this.renderer) return;
    this.paletteKey = key;
    this.renderer.setPalette(buildPalette(ui.countries.value));
  }

  private onFrame(f: FrameMsg) {
    if (f.tiles.idx.length) {
      for (let k = 0; k < f.tiles.idx.length; k++) { const i = f.tiles.idx[k], v = f.tiles.val[k]; this.owner[i] = v & 0xffff; this.controller[i] = v >>> 16; }
      this.renderer?.applyTiles(f.tiles.idx, f.tiles.val);
      this.dirty = true;
    }
    ui.date.value = f.date;
    ui.tick.value = f.tick;
    ui.speed.value = f.speed;
    if (f.countries) { ui.countries.value = f.countries; this.updatePalette(); }
    if (f.wars) ui.wars.value = f.wars;
    if (f.attacks) ui.attacks.value = f.attacks;
    if (f.peaceOffers) ui.peaceOffers.value = f.peaceOffers;
    if (f.labels) { this.labels = f.labels; this.dirty = true; }
    if (f.buildings) { this.icons = f.buildings; this.dirty = true; }
    if (f.selection !== undefined) ui.selection.value = f.selection;
    if (f.ships) { ui.ships.value = f.ships; this.dirty = true; }
    if (f.trade) ui.trade.value = f.trade;
    if (f.fleet) ui.fleet.value = f.fleet;
  }

  private onEvents(events: SimEvent[]) {
    const me = ui.playerId.value;
    const name = (id: number) => country(id)?.name ?? 'Someone';
    for (const e of events) {
      if (e.type === 'warDeclared' && e.b === me) { pushToast({ kind: 'war', text: `${name(e.a)} has declared war on you!` }); haptic('heavy'); }
      else if (e.type === 'warDeclared' && e.a === me) { pushToast({ kind: 'war', text: `You are at war with ${name(e.b)}.` }); haptic('heavy'); }
      else if (e.type === 'peaceOffered' && e.to === me) {
        const from = e.from;
        const id = pushToast({ kind: 'peace', sticky: true, text: `${name(from)} offers peace.`, actions: [
          { label: 'Accept', run: () => { this.send({ type: 'respondPeace', country: me, from, accept: true }); dismiss(); } },
          { label: 'Refuse', run: () => { this.send({ type: 'respondPeace', country: me, from, accept: false }); dismiss(); } },
        ] });
        const dismiss = () => { ui.toasts.value = ui.toasts.value.filter(t => t.id !== id); };
      }
      else if (e.type === 'peace' && (e.a === me || e.b === me)) pushToast({ kind: 'peace', text: `Peace with ${name(e.a === me ? e.b : e.a)}${e.transferred.length ? ` — ${e.transferred.length} state${e.transferred.length > 1 ? 's' : ''} changed hands` : ''}.` });
      else if (e.type === 'peaceRefused' && e.from === me) pushToast({ kind: 'info', text: `${name(e.to)} refused your peace offer.` });
      else if (e.type === 'built' && e.country === me) { pushToast({ kind: 'good', text: `${BUILDING_NAMES[e.building]} finished in ${this.map.states[e.state].name}.` }); haptic('light'); }
      else if (e.type === 'eliminated') pushToast({ kind: 'info', text: `${name(e.country)} has fallen.` });
      else if (e.type === 'rejected' && (e.command as Command).country === me) pushToast({ kind: 'info', text: rejectionText(e.reason) });
      else if (e.type === 'shipBuilt' && e.country === me) { pushToast({ kind: 'good', text: `A new ${e.kind === 'warship' ? 'warship' : 'transport'} is ready.` }); haptic('light'); }
      else if (e.type === 'shipLost' && e.country === me) pushToast({ kind: 'war', text: `You lost a ${e.kind === 'warship' ? 'warship' : 'transport'}.` });
      else if (e.type === 'shipCaptured' && e.owner === me) pushToast({ kind: 'war', text: `${name(e.by)} captured one of your trade ships.` });
      else if (e.type === 'shipCaptured' && e.by === me) pushToast({ kind: 'good', text: `Your navy captured a ${name(e.owner)} trade ship.` });
      else if (e.type === 'navalBattle' && (e.a === me || e.b === me)) pushToast({ kind: e.winner === me ? 'good' : 'war', text: e.winner === me ? 'Your navy won a battle at sea.' : 'Your navy lost a battle at sea.' });
    }
  }

  private onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const a = keyAction(e);
    if (!a) return;
    e.preventDefault();
    const tabs: Record<string, Tab> = { tabBuild: 'build', tabArmy: 'army', tabTrade: 'trade', tabDiplomacy: 'diplomacy', tabNation: 'nation' };
    if (a === 'pause') this.setSpeed(ui.speed.value === 0 ? 2 : 0);
    else if (a.startsWith('speed')) this.setSpeed(Number(a.slice(5)) as 1 | 2 | 3);
    else if (tabs[a]) ui.tab.value = ui.tab.value === tabs[a] ? null : tabs[a];
    else if (a === 'close') { ui.tab.value = null; this.selectState(null); }
    else {
      const d = 120;
      this.cam.pan(a === 'panLeft' ? d : a === 'panRight' ? -d : 0, a === 'panUp' ? d : a === 'panDown' ? -d : 0);
      this.dirty = true;
    }
  }

  send(cmd: Command) { this.host.send(cmd); }
  setSpeed(s: 0 | 1 | 2 | 3) { ui.speed.value = s; this.host.setSpeed(s); }

  selectTile([tx, ty]: [number, number]) {
    const x = Math.floor(tx), y = Math.floor(ty);
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return this.selectState(null);
    const tile = y * this.map.width + x;
    const s = this.map.stateOf[tile];
    ui.selectedTile.value = tile;
    ui.selectedSea.value = s || (this.map.terrain[tile] & 0x0f) !== 0 ? null : cellIndex(tile, this.map.width);
    this.selectState(s || null);
  }

  selectState(id: number | null) {
    if (id === null && ui.selectedSea.value === null) ui.selectedTile.value = null;
    ui.selectedState.value = id;
    if (id === null) ui.selection.value = null;
    this.host.select(id);
    this.renderer?.setSelectedState(id);
    this.dirty = true;
  }

  flyToState(id: number) {
    const [x, y] = this.map.states[id].centroid;
    this.cam.flyTo(x, y, Math.max(this.cam.zoom, 3));
    this.selectState(id);
  }

  /** The coast tile of a state, controlled by `target`, nearest a tapped tile (for Send boat). -1 if none. */
  beachNear(tile: number, stateId: number, target: number): number {
    const W = this.map.width;
    const tx = tile % W, ty = Math.floor(tile / W);
    let best = -1, bestD = Infinity;
    const r = 40;
    for (let y = Math.max(0, ty - r); y < Math.min(this.map.height, ty + r); y++) for (let x = Math.max(0, tx - r); x < Math.min(W, tx + r); x++) {
      const t = y * W + x;
      if (this.map.stateOf[t] !== stateId || !(this.map.terrain[t] & 0x40) || this.controller[t] !== target) continue;
      const d = (x - tx) * (x - tx) + (y - ty) * (y - ty);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** Owner of most of a state's tiles as the main thread currently sees it. */
  stateOwner(id: number): number { return ui.selection.value?.id === id ? ui.selection.value.owner : 0; }

  attack(target: number) {
    this.send({ type: 'attack', country: ui.playerId.value, target, ratio: Math.max(0.01, Math.min(1, ui.attackRatio.value)) });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const c of this.cleanups) c();
    this.cleanups = [];
    this.host.terminate();
  }
}

export function rejectionText(reason: string): string {
  const map: Record<string, string> = {
    'not at war': 'You need to be at war to attack them.', 'no border': 'You have no border there to attack across.',
    'not enough troops': 'Not enough troops for that attack.', cantAfford: 'Not enough money.', noSlots: 'No free building slots in that state.',
    tooManyConstructions: 'Your builders are busy. Wait for a construction to finish.', 'already at war': 'You are already at war with them.',
    'already offered': 'You already offered them peace.', needsShipyard: 'Ships are built in a state with a shipyard.', shipyardBusy: 'That shipyard is busy.',
    needsGoods: 'Not enough wood, iron or arms in stock.', 'no port on that sea': 'You need a port on that sea.', 'bad landing': 'Boats can only land on a coast you can attack.',
    unreachable: 'Your ships can’t reach there.',
  };
  return map[reason] ?? `That didn't work (${reason}).`;
}

export const session: { game: GameController | null } = { game: null };
