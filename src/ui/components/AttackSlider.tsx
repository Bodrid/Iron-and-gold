import { useRef } from 'preact/hooks';
import { ui } from '../store';

/** Share of troops sent per attack, under the right thumb. */
export function AttackSlider() {
  const track = useRef<HTMLDivElement>(null);
  const pct = Math.round(ui.attackRatio.value * 100);
  const set = (clientY: number) => {
    const r = track.current!.getBoundingClientRect();
    const v = 1 - (clientY - r.top) / r.height;
    ui.attackRatio.value = Math.max(0.05, Math.min(1, Math.round(v * 20) / 20));
  };
  return (
    <div class="attack-slider glass" data-ui="attack-slider">
      <small>Attack</small>
      <div class="track" ref={track} role="slider" aria-label="Share of troops to attack with" aria-valuemin={5} aria-valuemax={100} aria-valuenow={pct} tabIndex={0}
        onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); set(e.clientY); }}
        onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') set(e.clientY); }}
        onKeyDown={e => { if (e.key === 'ArrowUp') ui.attackRatio.value = Math.min(1, ui.attackRatio.value + 0.05); if (e.key === 'ArrowDown') ui.attackRatio.value = Math.max(0.05, ui.attackRatio.value - 0.05); }}>
        <div class="fill" style={{ height: `${pct}%` }} />
        <div class="knob" style={{ bottom: `${pct}%` }} />
      </div>
      <b>{pct}%</b>
    </div>
  );
}
