// Runs a game on the main thread: worker messages → map, overlay and UI state; taps → selection.
import type { MapData } from '../map/format';
import { Camera } from '../render/camera';
import { MapRenderer } from '../render/mapRenderer';
import { Overlay } from '../render/overlay';
import { buildPalette } from '../render/palette';
import { attachInput } from '../input/attach';
import { keyAction } from '../input/keyboard';
import type { BuildingIcon, Command, Label, PeaceTerms, SimEvent } from '../sim/types';
import { BALANCE } from '../sim/balance';
import { DIPLO_REASON } from './tabs/diploText';
import { LAW_BY_ID } from '../content/laws';
import { TECH_BY_ID } from '../content/techs';
import { GROUPS } from '../content/groups';
import { COMPANY_BY_ID } from '../content/companies';
import { eventById } from '../content/events';
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
    if (f.diplo) ui.diplo.value = f.diplo;
    if (f.politics) ui.politics.value = f.politics;
    if (f.events) { ui.events.value = f.events; if (ui.openEvent.value !== null && !f.events.pending.some(p => p.id === ui.openEvent.value)) ui.openEvent.value = null; }
    if (f.countryDetail !== undefined) ui.countryDetail.value = f.countryDetail;
  }

  private onEvents(events: SimEvent[]) {
    const me = ui.playerId.value;
    const name = (id: number) => country(id)?.name ?? 'Someone';
    for (const e of events) {
      if (e.type === 'warDeclared' && (e.a === me || e.b === me)) { pushToast({ kind: 'war', text: `War with ${name(e.a === me ? e.b : e.a)} has begun!` }); haptic('heavy'); }
      else if (e.type === 'peaceOffered' && e.to === me) {
        const from = e.from;
        const id = pushToast({ kind: 'peace', sticky: true, text: `${name(from)} offers peace: ${peaceTermsText(e.terms, this.map)}.`, actions: [
          { label: 'Accept', run: () => { this.send({ type: 'respondPeace', country: me, from, accept: true }); dismiss(); } },
          { label: 'Refuse', run: () => { this.send({ type: 'respondPeace', country: me, from, accept: false }); dismiss(); } },
        ] });
        const dismiss = () => { ui.toasts.value = ui.toasts.value.filter(t => t.id !== id); };
      }
      else if (e.type === 'peace' && (e.a === me || e.b === me)) pushToast({ kind: 'peace', text: `Peace with ${name(e.a === me ? e.b : e.a)}${e.transferred.length ? ` — ${e.transferred.length} state${e.transferred.length > 1 ? 's' : ''} changed hands` : ''}.` });
      else if (e.type === 'peaceRefused' && e.from === me) pushToast({ kind: 'info', text: `${name(e.to)} refused your peace offer.` });
      else if (e.type === 'built' && e.country === me) { pushToast({ kind: 'good', text: `${BUILDING_NAMES[e.building]} finished in ${this.map.states[e.state].name}.` }); haptic('light'); }
      else if (e.type === 'annexed' && (e.puppet === me || e.overlord === me)) pushToast({ kind: e.overlord === me ? 'good' : 'war', text: e.overlord === me ? `${name(e.puppet)} has been annexed.` : `${name(e.overlord)} annexed you.` });
      else if (e.type === 'puppeted' && e.overlord === me) pushToast({ kind: 'good', text: `${name(e.puppet)} is now your puppet.` });
      else if (e.type === 'techResearched' && e.country === me) { pushToast({ kind: 'good', text: `Researched ${TECH_BY_ID[e.tech]?.name ?? e.tech}.` }); haptic('light'); }
      else if (e.type === 'lawPassed' && e.country === me) pushToast({ kind: 'good', text: `${LAW_BY_ID[e.law]?.name ?? e.law} is now law.` });
      else if (e.type === 'lawFailed' && e.country === me) pushToast({ kind: 'info', text: `${LAW_BY_ID[e.law]?.name ?? e.law} failed: ${e.reason === 'noSupport' ? 'support collapsed' : e.reason === 'timeout' ? 'it took too long' : e.reason === 'revolution' ? 'the revolution changed that law' : 'your overlord blocked it'}.` });
      else if (e.type === 'revolt' && e.country === me) { pushToast({ kind: 'war', sticky: true, text: `Revolt! Your ${GROUPS[e.group].name.toLowerCase()} have risen up demanding ${LAW_BY_ID[e.law]?.name ?? 'change'}. Beat them, or give in from the Diplomacy tab (Make peace).` }); haptic('heavy'); }
      else if (e.type === 'revolt') pushToast({ kind: 'info', text: `Revolt in ${name(e.country)}: the ${GROUPS[e.group].name.toLowerCase()} have risen up.` });
      else if (e.type === 'revoltEnded' && e.country === me) pushToast({ kind: e.won ? 'war' : 'good', text: e.independence ? `${name(e.rebels)} has won its independence.` : e.won ? 'The rebels won: their law is now yours, and their land comes back to you.' : 'The revolt is over and the land is yours again.' });
      else if (e.type === 'revoltEnded' && e.independence) pushToast({ kind: 'info', text: `${name(e.rebels)} has won its independence from ${name(e.country)}.` });
      else if (e.type === 'revoltEnded') continue;
      else if (e.type === 'blocInvited' && e.to === me) {
        const from = e.from;
        const id = pushToast({ kind: 'peace', sticky: true, text: `${name(from)} invites you into its power bloc.`, actions: [
          { label: 'Join', run: () => { this.send({ type: 'respondBlocInvite', country: me, from, accept: true }); dismiss(); } },
          { label: 'Refuse', run: () => { this.send({ type: 'respondBlocInvite', country: me, from, accept: false }); dismiss(); } },
        ] });
        const dismiss = () => { ui.toasts.value = ui.toasts.value.filter(t => t.id !== id); };
      }
      else if (e.type === 'blocJoined' && (e.country === me || e.leader === me)) pushToast({ kind: 'good', text: e.country === me ? `You joined ${name(e.leader)}’s power bloc.` : `${name(e.country)} joined your power bloc.` });
      else if (e.type === 'blocRefused' && e.from === me) pushToast({ kind: 'info', text: `${name(e.to)} turned down your invitation.` });
      else if (e.type === 'blocLeft' && (e.country === me || e.leader === me)) pushToast({ kind: 'info', text: e.country === me ? `You left ${name(e.leader)}’s power bloc.` : `${name(e.country)} left your power bloc.` });
      else if (e.type === 'blocFounded') pushToast({ kind: e.leader === me ? 'good' : 'info', text: e.leader === me ? 'Your power bloc is founded. Invite members from their country panels.' : `${name(e.leader)} founded a power bloc.` });
      else if (e.type === 'blocLeaderChanged' && ui.diplo.value?.bloc.mine && (e.from === ui.diplo.value.bloc.mine.leader || e.to === me)) pushToast({ kind: 'info', text: `${name(e.to)} now leads the power bloc.` });
      else if (e.type === 'companyFounded' && e.country === me) pushToast({ kind: 'good', text: `${COMPANY_BY_ID[e.company]?.name ?? 'The company'} is founded.` });
      else if (e.type === 'charterEnded' && e.country === me) pushToast({ kind: 'info', text: `${COMPANY_BY_ID[e.company]?.name ?? 'A company'} lost its investment charter: you have no puppets left.` });
      else if (e.type === 'eventFired' && e.country === me) {
        const pending = e.pending, title = eventById(e.event)?.title ?? 'Something has happened';
        const id = pushToast({ kind: 'peace', sticky: true, text: `New event: ${title}`, actions: [{ label: 'Open', run: () => { ui.openEvent.value = pending; ui.toasts.value = ui.toasts.value.filter(t => t.id !== id); } }] });
        haptic('light');
      }
      else if (e.type === 'eventResolved' && e.country === me && e.skipped > 0) pushToast({ kind: 'info', text: `${e.skipped} of the chosen effects no longer applied and were skipped.` });
      else if (e.type === 'nationFormed') pushToast({ kind: e.country === me ? 'good' : 'info', text: e.country === me ? `You have proclaimed ${e.name}!` : `${e.name} has been proclaimed.` });
      else if (e.type === 'nationReleased') pushToast({ kind: 'info', text: `${name(e.country)} is now independent of ${name(e.from)}.` });
      else if (e.type === 'eliminated') pushToast({ kind: 'info', text: `${name(e.country)} has fallen.` });
      else if (e.type === 'rejected' && (e.command as Command).country === me) pushToast({ kind: 'info', text: rejectionText(e.reason) });
      else if (e.type === 'playCancelled' && e.target === me && !country(e.initiator)?.alive) continue;
      else if (e.type === 'playStarted' && e.target === me) { pushToast({ kind: 'war', sticky: true, text: `${name(e.initiator)} makes demands of you! You have ${BALANCE.diplomacy.PLAY_DAYS} days: give in or prepare for war (Diplomacy tab).`, actions: [{ label: 'Open', run: () => { ui.tab.value = 'diplomacy'; ui.sheet.value = 'half'; ui.toasts.value = ui.toasts.value.filter(t => !t.text.startsWith(name(e.initiator) + ' makes demands')); } }] }); haptic('heavy'); }
      else if (e.type === 'playStarted' && e.initiator === me) pushToast({ kind: 'info', text: `Your demands on ${name(e.target)} are out. Others have ${BALANCE.diplomacy.PLAY_DAYS} days to pick sides.` });
      else if (e.type === 'playJoined') { const p = ui.diplo.value?.plays.find(x => x.id === e.playId); if (p && (p.initiator === me || p.target === me)) pushToast({ kind: 'info', text: `${name(e.country)} joins ${e.side === 'A' ? name(p.initiator) : name(p.target)}’s side.` }); }
      else if (e.type === 'playYielded' && (e.initiator === me || e.target === me)) pushToast({ kind: e.initiator === me ? 'good' : 'war', text: e.initiator === me ? `${name(e.target)} gave in to your demands.` : `You gave in to ${name(e.initiator)}.` });
      else if (e.type === 'playCancelled' && e.target === me) pushToast({ kind: 'good', text: `${name(e.initiator)} backed down.` });
      else if (e.type === 'treatyOffered' && e.to === me) pushToast({ kind: 'peace', text: `${name(e.from)} proposes a treaty (Diplomacy tab).` });
      else if (e.type === 'treatySigned' && (e.a === me || e.b === me)) pushToast({ kind: 'good', text: `Treaty signed with ${name(e.a === me ? e.b : e.a)}.` });
      else if (e.type === 'treatyRefused' && e.from === me) pushToast({ kind: 'info', text: `${name(e.to)} turned down your treaty.` });
      else if (e.type === 'coalitionFormed' && e.target === me) pushToast({ kind: 'war', sticky: true, text: `A coalition of ${e.members.length} countries has formed against you. Lower your infamy.` });
      else if (e.type === 'puppeted' && e.puppet === me) pushToast({ kind: 'war', text: `You are now a puppet of ${name(e.overlord)}.` });
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
    const tabs: Record<string, Tab> = { tabBuild: 'build', tabArmy: 'army', tabTrade: 'trade', tabDiplomacy: 'diplomacy', tabResearch: 'research', tabBloc: 'bloc', tabNation: 'nation' };
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
    'already offered': 'You already offered them peace.', leader: 'Only the war leaders can make peace for everyone.', notTheirState: 'That state isn’t theirs.', needsShipyard: 'Ships are built in a state with a shipyard.', shipyardBusy: 'That shipyard is busy.',
    needsGoods: 'Not enough wood, iron or arms in stock.', 'no port on that sea': 'You need a port on that sea.', 'bad landing': 'Boats can only land on a coast you can attack.',
    unreachable: 'Your ships can’t reach there.',
    'queue full': 'The research queue is full.', 'cannot queue': 'That tech can’t be queued yet: queue what it needs first.', 'needs earlier techs': 'Research the techs it needs first.',
    'already known': 'You already know that tech.', 'not queued': 'That tech isn’t queued.', notEnacting: 'No law is being passed.', noSupport: 'Not enough support for that law.',
    alreadyEnacting: 'You are already passing another law.', rebels: 'Not possible with rebels.',
  };
  return map[reason] ?? (DIPLO_REASON[reason] ? `${DIPLO_REASON[reason]}.` : `That didn't work (${reason}).`);
}

/** "white peace", "they demand Take Saxony, Reparations", "they hand you Take Alsace". */
export function peaceTermsText(terms: PeaceTerms, map: MapData): string {
  if (terms.white || !terms.demands.length) return 'a white peace, nobody gives anything';
  const words = terms.give ? { puppet: 'becoming your puppet', openMarket: 'opening their market', reparations: 'reparations', joinBloc: 'joining your power bloc', independence: 'their independence' } : { puppet: 'you become their puppet', openMarket: 'you open your market', reparations: 'reparations', joinBloc: 'you join their power bloc', independence: 'their independence' };
  const list = terms.demands.map(d => (d.kind === 'state' ? `${map.states[d.state]?.name ?? 'a state'}` : d.kind === 'law' ? `the ${LAW_BY_ID[d.law]?.name ?? 'new'} law` : words[d.kind])).join(', ');
  return terms.give ? `they give you ${list}` : `they demand ${list}`;
}

export const session: { game: GameController | null } = { game: null };
