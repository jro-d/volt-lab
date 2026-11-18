/**
 * WireWise v2 device drawing kit.
 *
 * Every device is built in five layers so the catalogue reads as one product line:
 *   1. Housing   one body material, outlined in mat-line at stroke-housing, radius-device (3)
 *   2. Bays      20-unit terminal bays at the top and bottom, inset 3, seams between poles
 *   3. Face      raised face between the bays with a dark nameplate band (tag + rating)
 *   4. State     position plus one indicator (lever, flag window, LED, lens) — never a body tint
 *   5. Terminals the shared screw-cage TerminalPoint, IEC 60445 markings beside each screw
 *
 * All colours are design tokens (var(--…)); classes live in index.css (d-*, t-*).
 */
import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

/* ─────────────────────────── Tags ─────────────────────────── */

const TAG_PREFIX: Partial<Record<string, string>> = {
  mcb_1p: 'Q', mcb_2p: 'Q', mcb_3p: 'Q', service_disconnect_2p: 'Q0', rcd_2p: 'F', rcbo_1pn: 'Q', spd_surge: 'F',
  safety_breaker_2p: 'Q', contactor_3p: 'KM', thermal_overload_relay: 'F', industrial_relay_dpdt: 'K',
  timer_relay: 'KT', push_button_station: 'S', push_button_fwd_rev: 'S', push_button_estop: 'S0',
  selector_hoa: 'SA', limit_switch: 'SQ', pilot_light_indicator: 'H', motor_ac_industrial: 'M',
  motor_6lead_star_delta: 'M', control_transformer: 'T', vfd_drive: 'U',
  plc_micro_controller: 'A', kwh_meter_1p: 'P', kwh_meter_3p: 'P', panel_meter: 'P', ats_changeover: 'Q',
  source_3phase_440v: 'X', fuse_holder_1p: 'F', fuse_switch_disconnector_3p: 'Q', generator_set_1p: 'G', generator_set_3p: 'G', phase_monitor_relay: 'KP', float_switch: 'SL', pressure_switch: 'SP', pump_booster_1p: 'M', pump_booster_3p: 'M',
};

/** Reference designation for the nameplate (IEC 81346 style): taken from the device name when it
 *  carries one ("Contactor KM1" → KM1), otherwise the type's letter code. */
export const deviceTag = (device: ElectricalDevice): string => {
  if (typeof device.state.tag === 'string' && device.state.tag) return device.state.tag;
  const m = /\b(KM|KT|KA|QF|Q0|SQ|SA|S0|[QFKSHMTUAPX])\d{1,2}\b/.exec(device.name || '');
  if (m) return m[0];
  return TAG_PREFIX[device.type] || '';
};

/* ─────────────────────────── Layer 1–3: body ─────────────────────────── */

type Material = 'light' | 'dark' | 'shade' | 'pvc' | 'cast' | 'porcelain' | 'steel' | 'copper' | 'rubber';
const MAT_CLASS: Record<Material, string> = {
  light: 'd-housing', dark: 'd-dark', shade: 'd-shade', pvc: 'd-pvc', cast: 'd-cast',
  porcelain: 'd-porcelain', steel: 'd-steel', copper: 'd-copper', rubber: 'd-rubber',
};

export const Housing: React.FC<{ x?: number; y?: number; w: number; h: number; m?: Material; rx?: number }> = ({
  x = 0, y = 0, w, h, m = 'light', rx = 3,
}) => <rect className={MAT_CLASS[m]} x={x} y={y} width={w} height={h} rx={rx} />;

/** Terminal bay: recessed strip that holds a row of screw cages. */
export const Bay: React.FC<{ x: number; y: number; w: number; h?: number; dark?: boolean }> = ({ x, y, w, h = 20, dark }) => (
  <rect className={dark ? 'd-dark-face' : 'd-shade'} x={x} y={y} width={w} height={h} rx={2} />
);

/** Pole seams: thin vertical dividers through bays and face. */
export const Seams: React.FC<{ xs: number[]; y1: number; y2: number }> = ({ xs, y1, y2 }) => (
  <path className="d-seam" d={xs.map((x) => `M${x} ${y1}V${y2}`).join('')} />
);

export const Face: React.FC<{ x: number; y: number; w: number; h: number; dark?: boolean; rx?: number }> = ({ x, y, w, h, dark, rx = 2 }) => (
  <rect className={dark ? 'd-dark-face' : 'd-face'} x={x} y={y} width={w} height={h} rx={rx} />
);

/** Dark nameplate band: reference tag (left, mono) and model/rating (right, silk). */
export const Nameplate: React.FC<{
  x: number; y: number; w: number; h?: number; tag?: string; text?: string; center?: string; size?: number;
}> = ({ x, y, w, h = 8, tag, text, center, size = 5.2 }) => (
  <g className="pointer-events-none">
    <rect className="d-nameplate" x={x} y={y} width={w} height={h} rx={1.5} />
    {tag ? (
      <text className="t-tag" x={x + 2.5} y={y + h / 2 + size * 0.36} style={{ fontSize: size }}>
        {tag}
      </text>
    ) : null}
    {center ? (
      <text className="t-silk t-on-dark" x={x + w / 2} y={y + h / 2 + size * 0.36} textAnchor="middle" style={{ fontSize: size, fontWeight: 700 }}>
        {center}
      </text>
    ) : null}
    {text ? (
      <text className="t-silk t-on-dark" x={x + w - 2.5} y={y + h / 2 + size * 0.36} textAnchor="end" style={{ fontSize: size }}>
        {text}
      </text>
    ) : null}
  </g>
);

/** Silkscreen text (Barlow Semi Condensed). */
export const Silk: React.FC<{
  x: number; y: number; children: React.ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end';
  muted?: boolean; onDark?: boolean; bold?: boolean; fill?: string; ls?: number;
}> = ({ x, y, children, size = 6, anchor = 'start', muted, onDark, bold, fill, ls }) => (
  <text
    className={`t-silk${muted ? ' t-muted' : ''}${onDark ? ' t-on-dark' : ''}`}
    x={x}
    y={y}
    textAnchor={anchor}
    style={{ fontSize: size, fontWeight: bold ? 700 : undefined, fill, letterSpacing: ls }}
    pointerEvents="none"
  >
    {children}
  </text>
);

/** Monospace marking (terminal ids, values, codes). */
export const Mono: React.FC<{
  x: number; y: number; children: React.ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end';
  muted?: boolean; onDark?: boolean; fill?: string; weight?: number;
}> = ({ x, y, children, size = 5.5, anchor = 'start', muted, onDark, fill, weight }) => (
  <text
    className={`t-mono${muted ? ' t-muted' : ''}${onDark ? ' t-on-dark' : ''}`}
    x={x}
    y={y}
    textAnchor={anchor}
    style={{ fontSize: size, fill, fontWeight: weight }}
    pointerEvents="none"
  >
    {children}
  </text>
);

/* ─────────────────────────── Layer 4: state ─────────────────────────── */

export type FlagState = 'on' | 'off' | 'trip';
/** Position-indicator window (IEC 60417): red I = closed, green O = open, amber TRIP. */
export const Flag: React.FC<{ cx: number; y: number; state: FlagState; h?: number }> = ({ cx, y, state, h = 5.5 }) => {
  const w = state === 'trip' ? 16 : 10;
  const fill = state === 'on' ? 'var(--flag-on)' : state === 'trip' ? 'var(--flag-trip)' : 'var(--flag-off)';
  return (
    <g className="pointer-events-none">
      <rect x={cx - w / 2 - 0.8} y={y - 0.8} width={w + 1.6} height={h + 1.6} rx={1.4} fill="var(--mat-line)" />
      <rect x={cx - w / 2} y={y} width={w} height={h} rx={1} fill={fill} />
      <text
        x={cx}
        y={y + h - 1.3}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: h * 0.82, fill: state === 'trip' ? 'var(--mat-line)' : '#fff' }}
      >
        {state === 'on' ? 'I' : state === 'trip' ? 'TRIP' : 'O'}
      </text>
    </g>
  );
};

export type LampColor = 'green' | 'red' | 'amber' | 'blue' | 'white';
/** Indicator LED / lamp lens with IEC 60073 colour and glow when lit. */
export const Led: React.FC<{ cx: number; cy: number; r?: number; on: boolean; color?: LampColor; ring?: boolean }> = ({
  cx, cy, r = 2, on, color = 'green', ring = true,
}) => (
  <g className="pointer-events-none">
    {on && <circle cx={cx} cy={cy} r={r * 2.6} fill="var(--lamp-glow)" />}
    {ring && <circle cx={cx} cy={cy} r={r + 0.9} fill="var(--mat-line)" />}
    <circle cx={cx} cy={cy} r={r} fill={`var(--lamp-${color}-${on ? 'on' : 'off'})`} />
    <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.35} fill="#fff" opacity={on ? 0.75 : 0.25} />
  </g>
);

/** Decorative fixing screw (enclosure, cover, nameplate). */
export const Screw: React.FC<{ cx: number; cy: number; r?: number; m?: 'steel' | 'brass' | 'dark' }> = ({ cx, cy, r = 2, m = 'steel' }) => (
  <g className="pointer-events-none">
    <circle cx={cx} cy={cy} r={r} fill={m === 'brass' ? 'var(--mat-brass)' : m === 'dark' ? 'var(--mat-housing-dark-face)' : 'var(--term-screw)'} stroke="var(--term-screw-line)" strokeWidth={0.5} />
    <path d={`M${cx - r * 0.6} ${cy}H${cx + r * 0.6}`} stroke="var(--mat-line)" strokeWidth={r * 0.32} strokeLinecap="round" />
  </g>
);

/** DIN-rail clip tab at the bottom edge of a modular device. */
export const DinClip: React.FC<{ cx: number; y: number }> = ({ cx, y }) => (
  <g className="pointer-events-none">
    <rect x={cx - 4} y={y - 1} width={8} height={3.5} rx={1} className="d-shade" />
    <rect x={cx - 1.5} y={y + 0.2} width={3} height={1.2} rx={0.6} fill="var(--mat-line)" />
  </g>
);

/** Lead-seal / sealing hole (revenue meters, main switches). */
export const SealHole: React.FC<{ cx: number; cy: number }> = ({ cx, cy }) => (
  <g className="pointer-events-none">
    <circle cx={cx} cy={cy} r={1.6} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.5} />
    <circle cx={cx} cy={cy} r={0.6} fill="var(--mat-line)" />
  </g>
);

/** Toggle lever in a recessed slot (breakers, isolators). pos: 0 = up/ON … 1 = down/OFF. */
export const Lever: React.FC<{ cx: number; y: number; slotH?: number; w?: number; pos: number; color?: string }> = ({
  cx, y, slotH = 26, w = 15, pos, color = 'var(--act-black)',
}) => {
  const lh = 9;
  const ly = y + 2 + (slotH - lh - 4) * pos;
  return (
    <g>
      <rect className="d-shade" x={cx - w / 2 - 1.5} y={y} width={w + 3} height={slotH} rx={2} />
      <rect x={cx - w / 2 + 1.5} y={y + 2} width={w - 3} height={slotH - 4} rx={1} fill="var(--mat-line)" opacity={0.85} />
      <rect x={cx - w / 2} y={ly} width={w} height={lh} rx={1.5} fill={color} stroke="var(--mat-line)" strokeWidth={1} />
      <path d={`M${cx - w / 2 + 3} ${ly + 3.2}H${cx + w / 2 - 3}M${cx - w / 2 + 3} ${ly + 5.4}H${cx + w / 2 - 3}`} stroke="var(--silk-on-dark)" strokeWidth={0.6} opacity={0.55} />
    </g>
  );
};

/** Momentary push button (flush or guarded), IEC 60073 actuator colours. */
export const PushButton: React.FC<{
  cx: number; cy: number; r?: number; color: 'green' | 'red' | 'black' | 'yellow' | 'blue'; pressed?: boolean;
  legend?: string; guard?: boolean;
}> = ({ cx, cy, r = 8, color, pressed, legend, guard }) => (
  <g>
    {guard && <circle cx={cx} cy={cy} r={r + 3.2} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={1} />}
    <circle cx={cx} cy={cy} r={r + 1.6} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={0.9} />
    <circle cx={cx} cy={cy} r={r} fill={`var(--act-${color})`} stroke="var(--mat-line)" strokeWidth={1} />
    {!pressed && <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth={0.9} />}
    {pressed && <circle cx={cx} cy={cy} r={r} fill="var(--mat-line)" opacity={0.28} />}
    {legend && (
      <text
        x={cx}
        y={cy + r * 0.32}
        textAnchor="middle"
        pointerEvents="none"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: r * 0.95, fill: color === 'yellow' ? 'var(--mat-line)' : 'var(--on-act)' }}
      >
        {legend}
      </text>
    )}
  </g>
);

/** Legend plate above an actuator (white on black, like engraved traffolyte). */
export const LegendPlate: React.FC<{ cx: number; y: number; w: number; text: string; h?: number; color?: string }> = ({ cx, y, w, text, h = 6.5, color }) => (
  <g className="pointer-events-none">
    <rect x={cx - w / 2} y={y} width={w} height={h} rx={1} fill={color || 'var(--nameplate)'} />
    <text x={cx} y={y + h * 0.74} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: h * 0.72, fill: 'var(--silk-on-dark)', letterSpacing: '0.04em' }}>
      {text}
    </text>
  </g>
);

/* ─────────────────────────── IEC 60617 symbols (silkscreen) ─────────────────────────── */

type Sym = { x: number; y: number; s?: number; dark?: boolean };
const symCls = (dark?: boolean) => (dark ? 'd-sym-dark' : 'd-sym');

/** NO contact, vertical, height 10·s. */
export const SymNO: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <path className={symCls(dark)} d={`M${x} ${y}v${3 * s}l${2.6 * s} ${4 * s}M${x} ${y + 7 * s}v${3 * s}`} />
);
/** NC contact, vertical. */
export const SymNC: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <path className={symCls(dark)} d={`M${x} ${y}v${3 * s}l${-2.6 * s} ${4 * s}M${x} ${y + 7 * s}v${3 * s}M${x} ${y + 3 * s}h${-3 * s}`} />
);
/** Coil (rectangle). */
export const SymCoil: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <path className={symCls(dark)} d={`M${x} ${y}v${2.5 * s}M${x - 3 * s} ${y + 2.5 * s}h${6 * s}v${5 * s}h${-6 * s}zM${x} ${y + 7.5 * s}v${2.5 * s}`} />
);
/** Circuit-breaker contact (×), vertical. */
export const SymBreaker: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <path className={symCls(dark)} d={`M${x} ${y}v${3 * s}l${2.6 * s} ${4 * s}M${x} ${y + 7 * s}v${3 * s}M${x - 1 * s} ${y + 2 * s}l${2 * s} ${2 * s}M${x + 1 * s} ${y + 2 * s}l${-2 * s} ${2 * s}`} />
);
/** Thermal element (zig). */
export const SymThermal: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <path className={symCls(dark)} d={`M${x} ${y}v${2 * s}h${2 * s}v${3 * s}h${-4 * s}v${3 * s}h${2 * s}v${2 * s}`} />
);
/** Lamp (circle with ×). */
export const SymLamp: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <g className={symCls(dark)}>
    <circle cx={x} cy={y} r={3 * s} />
    <path d={`M${x - 2.1 * s} ${y - 2.1 * s}l${4.2 * s} ${4.2 * s}M${x + 2.1 * s} ${y - 2.1 * s}l${-4.2 * s} ${4.2 * s}`} />
  </g>
);
/** Earth (protective earth). */
export const SymEarth: React.FC<Sym> = ({ x, y, s = 1, dark }) => (
  <g className={symCls(dark)}>
    <circle cx={x} cy={y + 4 * s} r={4.4 * s} />
    <path d={`M${x} ${y}v${3.4 * s}M${x - 3 * s} ${y + 3.4 * s}h${6 * s}M${x - 2 * s} ${y + 5 * s}h${4 * s}M${x - 1 * s} ${y + 6.6 * s}h${2 * s}`} />
  </g>
);

/* ─────────────────────────── Layer 5: terminals ─────────────────────────── */

interface TerminalHandlers {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

/** Screw-cage terminals. `local` draws in the device's own frame (inside a translate). */
export const Terminals: React.FC<TerminalHandlers & { local?: boolean }> = ({
  device, selectedTerminalId, hoveredTerminalId, onTerminalMouseDown, setHoveredTerminalId, local,
}) => {
  const ox = local ? 0 : device.x;
  const oy = local ? 0 : device.y;
  return (
    <>
      {device.terminals.map((t) => {
        const termId = `${device.id}:${t.id}`;
        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={ox + device.width * t.relX}
            y={oy + device.height * t.relY}
            isSelected={selectedTerminalId === termId}
            isHovered={hoveredTerminalId === termId}
            onMouseDown={(e) => {
              e.stopPropagation();
              onTerminalMouseDown?.(device, t, e);
            }}
            onMouseEnter={() => setHoveredTerminalId?.(termId)}
            onMouseLeave={() => setHoveredTerminalId?.(null)}
          />
        );
      })}
    </>
  );
};

/** Terminal marking printed beside each screw (inside the bay, clear of the cage).
 *  side: where the text goes relative to the screw. */
export const TermIds: React.FC<{
  device: ElectricalDevice; local?: boolean; onDark?: boolean; size?: number; gap?: number;
  side?: (t: DeviceTerminal) => 'above' | 'below' | 'left' | 'right'; text?: (t: DeviceTerminal) => string; skip?: (t: DeviceTerminal) => boolean;
}> = ({ device, local, onDark, size = 5, gap = 0, side, text, skip }) => {
  const ox = local ? 0 : device.x;
  const oy = local ? 0 : device.y;
  return (
    <g className="pointer-events-none">
      {device.terminals.map((t) => {
        if (skip?.(t)) return null;
        const tx = ox + device.width * t.relX;
        const ty = oy + device.height * t.relY;
        const sd = side ? side(t) : t.relY < 0.5 ? 'below' : 'above';
        const label = text ? text(t) : (t.label || t.id).split(' ')[0];
        const pos =
          sd === 'below' ? { x: tx, y: ty + 6.4 + size + gap, a: 'middle' as const }
          : sd === 'above' ? { x: tx, y: ty - 7.6 - gap, a: 'middle' as const }
          : sd === 'left' ? { x: tx - 8.4, y: ty + size * 0.36, a: 'end' as const }
          : { x: tx + 8.4, y: ty + size * 0.36, a: 'start' as const };
        return (
          <text key={t.id} className={`t-mono${onDark ? ' t-on-dark' : ''}`} x={pos.x} y={pos.y} textAnchor={pos.a} style={{ fontSize: size }}>
            {label}
          </text>
        );
      })}
    </g>
  );
};

/** Common props every device component receives from DeviceRenderer. */
export interface DeviceProps extends TerminalHandlers {
  onToggleState?: (device: ElectricalDevice) => void;
  onPatchState?: (deviceId: string, patch: Record<string, any>) => void;
}

/** Click handler that stops the canvas from starting a drag. */
export const click = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn();
};

/** Props for an on-device control: swallow the mouse-down (no canvas drag) and run on click. */
export const act = (fn: () => void) => ({
  onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
  onClick: (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  },
  className: 'cursor-pointer',
});

/** Merge a state patch into the live device (via onPatchState when the host provides it). */
export const makePatch = (props: DeviceProps) => (p: Record<string, any>) => {
  const { device, onPatchState, onToggleState } = props;
  if (onPatchState) onPatchState(device.id, p);
  else {
    Object.assign(device.state, p);
    onToggleState?.({ ...device, state: { ...device.state, ...p } });
  }
};

export { momentaryPress } from './DeviceTerminals';

/* ─────────────────────────── Wiring devices ─────────────────────────── */

/** Wall plate: white thermoset plate with a bevelled inner frame. */
export const WallPlate: React.FC<{ w: number; h: number; inset?: number }> = ({ w, h, inset = 5 }) => (
  <g>
    <rect className="d-housing" x={0} y={0} width={w} height={h} rx={5} />
    <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} rx={3} fill="none" stroke="var(--mat-housing-shade)" strokeWidth={1.4} />
  </g>
);

/** Rocker: the pressed half is shaded, a small bar marks ON. top = pressed at top. */
export const Rocker: React.FC<{ x: number; y: number; w: number; h: number; on: boolean; mark?: [string, string] }> = ({ x, y, w, h, on, mark }) => (
  <g>
    <rect x={x - 1.2} y={y - 1.2} width={w + 2.4} height={h + 2.4} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
    <rect x={x} y={y} width={w} height={h} rx={2.5} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={0.9} />
    <rect x={x} y={on ? y : y + h / 2} width={w} height={h / 2} rx={2.5} fill="var(--mat-line)" opacity={0.12} />
    <path d={`M${x + 2} ${y + h / 2}h${w - 4}`} stroke="var(--mat-line-soft)" strokeWidth={0.6} />
    <rect x={x + w / 2 - 4} y={on ? y + 3 : y + h - 5} width={8} height={2} rx={1} fill={on ? 'var(--flag-on)' : 'var(--mat-line-soft)'} />
    {mark && (
      <>
        <text x={x + w / 2} y={y + h * 0.3} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 4.4, fill: 'var(--silk-muted)' }} pointerEvents="none">{mark[0]}</text>
        <text x={x + w / 2} y={y + h * 0.82} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 4.4, fill: 'var(--silk-muted)' }} pointerEvents="none">{mark[1]}</text>
      </>
    )}
  </g>
);

/** Small FRONT/REAR (or any) toggle pill drawn on a device. */
export const Pill: React.FC<{ cx: number; cy: number; w: number; label: string; active?: boolean; title: string; onToggle: () => void }> = ({
  cx, cy, w, label, active, title, onToggle,
}) => (
  <g {...act(onToggle)}>
    <title>{title}</title>
    <rect x={cx - w / 2} y={cy - 3.6} width={w} height={7.2} rx={3.6} fill={active ? 'var(--act-blue)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.6} />
    <text x={cx} y={cy + 1.5} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 4.2, fill: active ? 'var(--on-act)' : 'var(--silk)' }}>{label}</text>
  </g>
);

/** Internal conductor drawn in a rear / cutaway view (copper strap). */
export const Strap: React.FC<{ d: string; live?: boolean; w?: number }> = ({ d, live, w = 1.6 }) => (
  <path d={d} fill="none" stroke={live ? 'var(--mat-copper)' : 'var(--mat-copper-dark)'} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
);
