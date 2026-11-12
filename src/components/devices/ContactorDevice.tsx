import React from 'react';
import { DeviceComponentProps, DeviceTerminals, SvgPill, stopCanvas } from './DeviceTerminals';

/**
 * 3-pole AC-3 motor contactor (Schneider TeSys LC1D / Siemens 3RT style) with a front-mounted
 * 1NO + 1NC auxiliary block (13-14 NO seal-in, 21-22 NC interlock).
 *
 * viewMode 'cutaway' renders an X-ray cross-section: A1-A2 copper coil on a laminated E-core,
 * moving armature + return springs, and the contact carrier whose copper bridges pull down onto
 * the fixed silver contacts when the coil is energized.
 */
export const ContactorDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isClosed = !!(device.state.coilEnergized || device.state.closed || device.state.manualOverride);
  const coilOn = !!device.state.coilEnergized;
  const isCutaway = device.state.viewMode === 'cutaway';
  const tag: string = device.state.tag || 'KM1';
  const role: string | undefined = device.state.role;
  const amps = device.state.measuredAmps || 0;

  const mainW = width * 0.69; // main contactor housing
  const auxX = x + width * 0.705; // front auxiliary block
  const auxW = width - width * 0.705;
  const poleX = [0.25, 0.41, 0.57].map((r) => x + width * r);
  const travel = isClosed ? 6 : 0; // armature / carrier stroke (px)

  const patch = (p: Record<string, any>) => {
    if (onPatchState) onPatchState(device.id, p);
    else onToggleState?.({ ...device, state: { ...device.state, ...p } });
  };

  const toggleCutaway = () => patch({ viewMode: isCutaway ? 'front' : 'cutaway' });
  const togglePlunger = (e: React.MouseEvent) => {
    e.stopPropagation();
    patch({ manualOverride: !device.state.manualOverride });
  };

  const moving = { transform: `translateY(${travel}px)`, transition: 'transform 110ms cubic-bezier(.2,.9,.3,1.3)' } as React.CSSProperties;

  return (
    <g id={`device-${device.id}`}>
      <defs>
        <linearGradient id="km-housing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="km-aux" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d4d8de" />
          <stop offset="100%" stopColor="#aeb5bf" />
        </linearGradient>
        <linearGradient id="km-copper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="50%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id="km-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <pattern id="km-lam" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#64748b" />
          <line x1="0" y1="0" x2="0" y2="3" stroke="#334155" strokeWidth="0.8" />
        </pattern>
        <pattern id="km-xray" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#06101f" />
          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#0e2a47" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* DIN-rail clip shadow */}
      <rect x={x + 6} y={y + height / 2 - 9} width={width - 12} height={18} rx={2} fill="#64748b" opacity={0.25} />

      {/* ───── Main housing ───── */}
      <rect
        x={x}
        y={y}
        width={mainW}
        height={height}
        rx={6}
        fill="url(#km-housing)"
        stroke="#94a3b8"
        strokeWidth={1.3}
        filter="drop-shadow(0 6px 12px rgba(15,23,42,0.18))"
      />
      {/* Terminal shrouds (top / bottom) */}
      <rect x={x + 2} y={y + 2} width={mainW - 4} height={20} rx={4} fill="#334155" />
      <rect x={x + 2} y={y + height - 22} width={mainW - 4} height={20} rx={4} fill="#334155" />
      {/* Finger-safe shroud ribs */}
      {[0.165, 0.33, 0.49].map((r, i) => (
        <React.Fragment key={i}>
          <line x1={x + width * r} y1={y + 3} x2={x + width * r} y2={y + 21} stroke="#1e293b" strokeWidth={1.2} />
          <line x1={x + width * r} y1={y + height - 21} x2={x + width * r} y2={y + height - 3} stroke="#1e293b" strokeWidth={1.2} />
        </React.Fragment>
      ))}

      {!isCutaway ? (
        <g>
          {/* Arc-chute cooling vents */}
          {[28, 32, 36].map((vy) => (
            <line key={vy} x1={x + 14} y1={y + vy} x2={x + mainW - 14} y2={y + vy} stroke="#94a3b8" strokeWidth={1.4} strokeLinecap="round" />
          ))}

          {/* Brand nameplate */}
          <rect x={x + 8} y={y + 42} width={mainW - 16} height={22} rx={2.5} fill="#ffffff" stroke="#cbd5e1" strokeWidth={0.8} />
          <text x={x + 13} y={y + 51} fontSize="6.5" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#15803d">
            TeSys
          </text>
          <text x={x + mainW - 10} y={y + 51} textAnchor="end" fontSize="5" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#334155">
            LC1D32
          </text>
          <text x={x + 13} y={y + 59.5} fontSize="4.3" fontWeight="700" fontFamily="ui-monospace, monospace" fill="#64748b">
            AC-3 32A · 15kW 440V · Uc 220V~
          </text>

          {/* Manual test plunger / contact position indicator */}
          <g transform={`translate(${x + mainW / 2}, ${y + 80})`} onMouseDown={stopCanvas} onClick={togglePlunger} className="cursor-pointer">
            <title>Manual test plunger — click to force the armature in (test only)</title>
            <rect x={-17} y={-11} width={34} height={22} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
            <rect
              x={-13}
              y={-8}
              width={26}
              height={14}
              rx={2}
              fill={isClosed ? '#f97316' : '#e2e8f0'}
              stroke={isClosed ? '#9a3412' : '#94a3b8'}
              strokeWidth={0.8}
              style={moving}
            />
            <text x={0} y={2} textAnchor="middle" fontSize="6.5" fontWeight="900" fill={isClosed ? '#ffffff' : '#334155'} style={moving}>
              {isClosed ? 'I' : 'O'}
            </text>
          </g>

          {/* Device tag + live current */}
          <rect x={x + 8} y={y + 95} width={mainW - 16} height={12} rx={2} fill="#fef9c3" stroke="#eab308" strokeWidth={0.7} />
          <text x={x + mainW / 2} y={y + 103.3} textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#713f12">
            {tag}{role ? ` · ${role}` : ''}{amps > 0 ? ` · ${amps.toFixed(1)}A` : ''}
          </text>
        </g>
      ) : (
        <g>
          {/* ───── X-RAY CUTAWAY ───── */}
          <rect x={x + 4} y={y + 23} width={mainW - 8} height={height - 46} rx={3} fill="url(#km-xray)" stroke="#0ea5e9" strokeWidth={0.8} />

          {/* Load-side copper strips running down the housing walls (behind magnet) */}
          {poleX.map((px, i) => (
            <path
              key={`ld${i}`}
              d={`M ${px} ${y + height - 12} L ${px} ${y + height - 26} L ${px + 6} ${y + height - 30} L ${px + 6} ${y + 52}`}
              fill="none"
              stroke="#c2410c"
              strokeWidth={2}
              opacity={0.55}
            />
          ))}
          {/* Line-side fixed contacts */}
          {poleX.map((px, i) => (
            <g key={`ln${i}`}>
              <path d={`M ${px} ${y + 12} L ${px} ${y + 30} L ${px - 6} ${y + 34} L ${px - 6} ${y + 52}`} fill="none" stroke="url(#km-copper)" strokeWidth={2.4} />
              {/* fixed silver contact pads */}
              <rect x={px - 9} y={y + 51} width={6} height={2.6} rx={0.8} fill="#e5e7eb" stroke="#475569" strokeWidth={0.4} />
              <rect x={px + 3} y={y + 51} width={6} height={2.6} rx={0.8} fill="#e5e7eb" stroke="#475569" strokeWidth={0.4} />
              {/* arc chute splitter plates */}
              {[0, 1, 2].map((k) => (
                <line key={k} x1={px - 7} y1={y + 37 + k * 2.6} x2={px + 7} y2={y + 37 + k * 2.6} stroke="#64748b" strokeWidth={0.8} opacity={0.8} />
              ))}
            </g>
          ))}

          {/* Moving system: contact carrier + bridges + armature (pulled down by the magnet) */}
          <g style={moving}>
            {/* Insulating contact carrier (crossbar) */}
            <rect x={x + 14} y={y + 42} width={mainW - 28} height={4} rx={1} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.5} />
            {/* Copper contact bridges with silver tips */}
            {poleX.map((px, i) => (
              <g key={`br${i}`}>
                <rect x={px - 10} y={y + 46.5} width={20} height={2.6} rx={0.8} fill="url(#km-copper)" stroke="#7c2d12" strokeWidth={0.4} />
                <rect x={px - 9} y={y + 48.4} width={5} height={1.3} fill="#f8fafc" />
                <rect x={px + 4} y={y + 48.4} width={5} height={1.3} fill="#f8fafc" />
              </g>
            ))}
            {/* Carrier stem */}
            <rect x={x + mainW / 2 - 2} y={y + 46} width={4} height={14} fill="#cbd5e1" />
            {/* Laminated moving armature (I / E-core top) */}
            <rect x={x + 16} y={y + 60} width={mainW - 32} height={7} rx={1} fill="url(#km-lam)" stroke="#94a3b8" strokeWidth={0.6} />
          </g>

          {/* Contact touch glint */}
          {isClosed &&
            poleX.map((px, i) => (
              <g key={`gl${i}`}>
                <circle cx={px - 6} cy={y + 52} r={2} fill="#fde047" opacity={0.85} />
                <circle cx={px + 6} cy={y + 52} r={2} fill="#fde047" opacity={0.85} />
              </g>
            ))}

          {/* Helical return springs between armature and fixed core */}
          {[x + 19, x + mainW - 19].map((sx, i) => {
            const top = y + 67 + travel;
            const bottom = y + 78;
            const turns = 5;
            const step = (bottom - top) / turns;
            let d = `M ${sx} ${top}`;
            for (let k = 0; k < turns; k++) {
              d += ` L ${sx + (k % 2 === 0 ? 3 : -3)} ${top + step * (k + 0.5)}`;
            }
            d += ` L ${sx} ${bottom}`;
            return <path key={i} d={d} fill="none" stroke="#e2e8f0" strokeWidth={0.9} style={{ transition: 'd 110ms' }} />;
          })}

          {/* Fixed laminated E-core */}
          <path
            d={`M ${x + 16} ${y + 78} h ${mainW - 32} v 24 h -${mainW - 32} Z`}
            fill="url(#km-lam)"
            stroke="#94a3b8"
            strokeWidth={0.6}
          />
          {/* Shading ring on centre pole */}
          <rect x={x + mainW / 2 - 5} y={y + 77} width={10} height={2.4} fill="#b45309" />

          {/* A1-A2 copper coil windings */}
          <rect
            x={x + 22}
            y={y + 82}
            width={mainW - 44}
            height={14}
            rx={2}
            fill={coilOn ? '#f97316' : '#b45309'}
            stroke={coilOn ? '#fdba74' : '#78350f'}
            strokeWidth={0.8}
            filter={coilOn ? 'drop-shadow(0 0 4px rgba(249,115,22,0.9))' : undefined}
          />
          {Array.from({ length: 11 }).map((_, k) => (
            <line
              key={k}
              x1={x + 24 + k * ((mainW - 48) / 10)}
              y1={y + 82.5}
              x2={x + 24 + k * ((mainW - 48) / 10)}
              y2={y + 95.5}
              stroke={coilOn ? '#fed7aa' : '#92400e'}
              strokeWidth={0.6}
            />
          ))}
          <text x={x + mainW / 2} y={y + 91.5} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fff7ed">
            COIL A1–A2
          </text>
          {/* Magnetic flux loops */}
          {coilOn && (
            <g fill="none" stroke="#38bdf8" strokeWidth={0.7} strokeDasharray="2 2" className="animate-[dash_0.6s_linear_infinite]">
              <path d={`M ${x + 18} ${y + 101} Q ${x + 12} ${y + 80} ${x + 22} ${y + 66}`} />
              <path d={`M ${x + mainW - 18} ${y + 101} Q ${x + mainW - 12} ${y + 80} ${x + mainW - 22} ${y + 66}`} />
            </g>
          )}
          {/* Coil leads to A1 (top) / A2 (bottom) */}
          <path d={`M ${x + width * 0.08} ${y + 14} L ${x + width * 0.08} ${y + 86} L ${x + 22} ${y + 86}`} fill="none" stroke="#a855f7" strokeWidth={0.9} strokeDasharray="2 1.5" />
          <path d={`M ${x + width * 0.08} ${y + height - 14} L ${x + width * 0.08} ${y + 93} L ${x + 22} ${y + 93}`} fill="none" stroke="#a855f7" strokeWidth={0.9} strokeDasharray="2 1.5" />

          {/* Callouts */}
          <text x={x + mainW - 7} y={y + 30} textAnchor="end" fontSize="4" fontWeight="800" fill="#7dd3fc" fontFamily="ui-monospace, monospace">
            ARC CHUTE
          </text>
          <text x={x + mainW - 7} y={y + 111} textAnchor="end" fontSize="4" fontWeight="800" fill="#7dd3fc" fontFamily="ui-monospace, monospace">
            {coilOn ? 'ENERGIZED · PULLED IN' : isClosed ? 'MANUAL PLUNGER' : 'SPRING RELEASED'}
          </text>
        </g>
      )}

      {/* ───── Front auxiliary contact block (1NO + 1NC) ───── */}
      <rect x={auxX} y={y + 6} width={auxW} height={height - 12} rx={4} fill="url(#km-aux)" stroke="#8b939e" strokeWidth={1} />
      <rect x={auxX + 2} y={y + 8} width={auxW - 4} height={16} rx={2} fill="#334155" />
      <rect x={auxX + 2} y={y + height - 24} width={auxW - 4} height={16} rx={2} fill="#334155" />
      <text x={auxX + auxW / 2} y={y + 33} textAnchor="middle" fontSize="4.4" fontWeight="900" fill="#1e293b" fontFamily="ui-monospace, monospace">
        LADN11
      </text>
      {/* NO 13-14 state window */}
      {(() => {
        const cx = x + width * 0.78;
        const cy = y + 58;
        return (
          <g>
            <rect x={cx - 7} y={cy - 16} width={14} height={32} rx={2} fill={isCutaway ? '#06101f' : '#f8fafc'} stroke="#64748b" strokeWidth={0.6} />
            <line x1={cx} y1={cy - 14} x2={cx} y2={cy - 5} stroke={isClosed ? '#16a34a' : '#475569'} strokeWidth={1.2} />
            <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 14} stroke={isClosed ? '#16a34a' : '#475569'} strokeWidth={1.2} />
            <line
              x1={cx}
              y1={cy + 5}
              x2={isClosed ? cx : cx - 5}
              y2={cy - 5}
              stroke={isClosed ? '#16a34a' : '#475569'}
              strokeWidth={1.4}
              style={{ transition: 'all 110ms' }}
            />
            <text x={cx} y={cy + 23} textAnchor="middle" fontSize="4.2" fontWeight="900" fill="#065f46" fontFamily="ui-monospace, monospace">NO</text>
          </g>
        );
      })()}
      {/* NC 21-22 state window */}
      {(() => {
        const cx = x + width * 0.93;
        const cy = y + 58;
        const ncClosed = !isClosed;
        return (
          <g>
            <rect x={cx - 7} y={cy - 16} width={14} height={32} rx={2} fill={isCutaway ? '#06101f' : '#f8fafc'} stroke="#64748b" strokeWidth={0.6} />
            <line x1={cx} y1={cy - 14} x2={cx} y2={cy - 5} stroke={ncClosed ? '#16a34a' : '#dc2626'} strokeWidth={1.2} />
            <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 14} stroke={ncClosed ? '#16a34a' : '#dc2626'} strokeWidth={1.2} />
            <line
              x1={cx}
              y1={cy + 5}
              x2={ncClosed ? cx : cx + 5}
              y2={cy - 5}
              stroke={ncClosed ? '#16a34a' : '#dc2626'}
              strokeWidth={1.4}
              style={{ transition: 'all 110ms' }}
            />
            <line x1={cx - 3} y1={cy - 5} x2={cx + 3} y2={cy - 5} stroke={ncClosed ? '#16a34a' : '#dc2626'} strokeWidth={0.9} />
            <text x={cx} y={cy + 23} textAnchor="middle" fontSize="4.2" fontWeight="900" fill="#92400e" fontFamily="ui-monospace, monospace">NC</text>
          </g>
        );
      })()}

      {/* Coil status LED */}
      <circle cx={auxX + auxW / 2} cy={y + 90} r={3.2} fill={coilOn ? '#22c55e' : '#475569'} stroke="#0f172a" strokeWidth={0.7} />
      {coilOn && <circle cx={auxX + auxW / 2} cy={y + 90} r={6} fill="#22c55e" opacity={0.35} className="animate-ping" />}

      {/* Cutaway toggle pill */}
      <SvgPill
        x={auxX + auxW / 2}
        y={y + 103}
        w={auxW - 4}
        label={isCutaway ? 'FRONT' : 'X-RAY'}
        active={isCutaway}
        title="Toggle X-ray internal cutaway (coil, armature, spring, contact bridges)"
        onClick={toggleCutaway}
      />

      <DeviceTerminals
        {...props}
        labelColor={(t) =>
          t.type === 'coil' ? '#d8b4fe' : t.type === 'no' ? '#6ee7b7' : t.type === 'nc' ? '#fcd34d' : '#e2e8f0'
        }
      />
    </g>
  );
};
