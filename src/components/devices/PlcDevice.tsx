import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style Micro-PLC Controller (Siemens LOGO! aesthetic).
 * Sliced top L/N/I1-I4 bay, crisp navy faceplate, backlit LCD menu/monitor,
 * 4-way navigation diamond + ESC/OK keypad, and Q1..Q4 relay output pairs.
 */
export const PlcDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const powered = !!device.state.plcPowered;
  const inputs: Record<string, boolean> = device.state.plcInputs || {};
  const outputs: Record<string, boolean> = device.state.plcOutputs || {};
  const pageIdx = Number(device.state.plcMenuPage || 0) % 2;

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = pageIdx === 0 ? 1 : 0;
    if (onPatchState) onPatchState(device.id, { plcMenuPage: next });
    else onToggleState?.({ ...device, state: { ...device.state, plcMenuPage: next } });
  };

  const topTerminals: Array<{ relX: number; label: string; color: string }> = [
    { relX: 0.12, label: 'L1', color: '#f87171' },
    { relX: 0.24, label: 'N', color: '#60a5fa' },
    { relX: 0.44, label: 'I1', color: '#e2e8f0' },
    { relX: 0.58, label: 'I2', color: '#e2e8f0' },
    { relX: 0.72, label: 'I3', color: '#e2e8f0' },
    { relX: 0.86, label: 'I4', color: '#e2e8f0' },
  ];

  const qGroups: Array<{ label: string; cxRel: number; r1: number; r2: number; active: boolean }> = [
    { label: 'Q1', cxRel: 0.20, r1: 0.14, r2: 0.26, active: !!outputs.q1 },
    { label: 'Q2', cxRel: 0.46, r1: 0.40, r2: 0.52, active: !!outputs.q2 },
    { label: 'Q3', cxRel: 0.71, r1: 0.66, r2: 0.76, active: !!outputs.q3 },
    { label: 'Q4', cxRel: 0.90, r1: 0.86, r2: 0.94, active: !!outputs.q4 },
  ];

  return (
    <g className="select-none">
      {/* Architectural CAD Shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15, 23, 42, 0.16)" />

      {/* Grey/Slate Industrial LOGO! Enclosure */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#9ca3af" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Power & Digital Input Terminal Bay */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={17.5} rx={2} fill="#4b5563" stroke="#1f2937" strokeWidth={0.7} />
      {[0.34, 0.51, 0.65, 0.79].map((r) => (
        <line key={`pt-${r}`} x1={x + width * r} y1={y + 2} x2={x + width * r} y2={y + 19.5} stroke="#1f2937" strokeWidth={0.8} />
      ))}

      {/* Embedded Top Terminal Label Strip */}
      <rect x={x + 2} y={y + 19.5} width={width - 4} height={7.5} fill="#1f2937" />
      {topTerminals.map((t) => (
        <text
          key={`plct-${t.label}`}
          x={x + width * t.relX}
          y={y + 25}
          textAnchor="middle"
          fontSize="4.6"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill={t.color}
        >
          {t.label}
        </text>
      ))}

      {/* Dark Navy LOGO! Header Band */}
      <rect x={x + 2} y={y + 27} width={width - 4} height={11} fill="#0f172a" />
      <text x={x + 7} y={y + 34.4} fontSize="5.4" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#38bdf8" letterSpacing="0.4">
        VOLTLAB
      </text>
      <text x={x + 41} y={y + 34.4} fontSize="5.4" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#ffffff">
        LOGO!
      </text>
      <text x={x + width - 6} y={y + 34.1} textAnchor="end" fontSize="3.8" fontWeight="700" fontFamily="ui-monospace, monospace" fill="#cbd5e1">
        AC/DC 115..240V · RUN
      </text>

      {/* Main Operator Console Zone (y+39 .. y+89) */}
      {/* Left: Monochrome/Backlit LOGO! LCD Screen */}
      <g onMouseDown={stopCanvas} onClick={toggleMenu} className="cursor-pointer">
        <title>Click PLC LCD to cycle menu / I/O monitor</title>
        <rect x={x + 6} y={y + 40} width={78} height={47} rx={2} fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
        <rect x={x + 8} y={y + 42} width={74} height={43} rx={1} fill={powered ? '#f8fafc' : '#1e293b'} />

        {powered ? (
          pageIdx === 0 ? (
            <g>
              {/* Classic LOGO! inverted cursor row */}
              <rect x={x + 9} y={y + 43} width={72} height={7.5} fill="#0f172a" />
              <text x={x + 11.5} y={y + 48.5} fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
                {'>'} Monitor I/O
              </text>
              <circle cx={x + 76} cy={y + 46.8} r={1.8} fill="#22c55e" />

              {/* Input Row */}
              <text x={x + 11} y={y + 58} fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#334155">
                IN
              </text>
              {(['i1', 'i2', 'i3', 'i4'] as const).map((k, idx) => {
                const bx = x + 23 + idx * 14;
                const on = !!inputs[k];
                return (
                  <g key={k}>
                    <rect x={bx} y={y + 52} width={11} height={8} rx={1} fill={on ? '#16a34a' : '#e2e8f0'} stroke="#64748b" strokeWidth={0.5} />
                    <text x={bx + 5.5} y={y + 57.6} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill={on ? '#ffffff' : '#334155'}>
                      I{idx + 1}
                    </text>
                  </g>
                );
              })}

              {/* Output Row */}
              <text x={x + 11} y={y + 70} fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#334155">
                OUT
              </text>
              {(['q1', 'q2', 'q3', 'q4'] as const).map((k, idx) => {
                const bx = x + 23 + idx * 14;
                const on = !!outputs[k];
                return (
                  <g key={k}>
                    <rect x={bx} y={y + 64} width={11} height={8} rx={1} fill={on ? '#ea580c' : '#e2e8f0'} stroke="#64748b" strokeWidth={0.5} />
                    <text x={bx + 5.5} y={y + 69.6} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill={on ? '#ffffff' : '#334155'}>
                      Q{idx + 1}
                    </text>
                  </g>
                );
              })}

              <text x={x + 11} y={y + 81} fontSize="4" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#475569">
                LAN · RUN · 60Hz
              </text>
            </g>
          ) : (
            <g>
              <rect x={x + 9} y={y + 43} width={72} height={7.5} fill="#0f172a" />
              <text x={x + 11.5} y={y + 48.5} fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
                {'>'} Program Menu
              </text>
              {['Start', 'Setup', 'Diagnostics'].map((item, idx) => (
                <text key={item} x={x + 12} y={y + 59 + idx * 9} fontSize="4.5" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#0f172a">
                  {item}
                </text>
              ))}
            </g>
          )
        ) : (
          <text x={x + 45} y={y + 65} textAnchor="middle" fontSize="4.8" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#64748b">
            NO POWER (L1/N)
          </text>
        )}
      </g>

      {/* Right: Memory slot detail + 4-way navigation diamond + ESC/OK buttons */}
      <rect x={x + 90} y={y + 40} width={58} height={9} rx={1.5} fill="#4b5563" stroke="#1f2937" strokeWidth={0.6} />
      <circle cx={x + 97} cy={y + 44.5} r={2.2} fill={powered ? '#22c55e' : '#64748b'} />
      <text x={x + 102} y={y + 46} fontSize="3.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f8fafc">
        {powered ? 'RUN/OK' : 'STOP'}
      </text>

      {/* 4-Way Directional Keypad */}
      <g onMouseDown={stopCanvas} onClick={toggleMenu} className="cursor-pointer">
        {[
          { px: x + 119, py: y + 53, sym: '▲' },
          { px: x + 119, py: y + 71, sym: '▼' },
          { px: x + 107, py: y + 62, sym: '◄' },
          { px: x + 131, py: y + 62, sym: '►' },
        ].map((b, i) => (
          <g key={`nav-${i}`}>
            <rect x={b.px - 5} y={b.py - 4.5} width={10} height={9} rx={1.5} fill="#f1f5f9" stroke="#334155" strokeWidth={0.8} />
            <text x={b.px} y={b.py + 1.8} textAnchor="middle" fontSize="4.5" fill="#1e293b">
              {b.sym}
            </text>
          </g>
        ))}

        {/* ESC (Gray) and OK (Bright Green) bottom buttons */}
        <rect x={x + 98} y={y + 79} width={16} height={9} rx={1.5} fill="#e2e8f0" stroke="#334155" strokeWidth={0.8} />
        <text x={x + 106} y={y + 85} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1e293b">
          ESC
        </text>
        <rect x={x + 124} y={y + 79} width={16} height={9} rx={1.5} fill="#16a34a" stroke="#065f46" strokeWidth={0.8} />
        <text x={x + 132} y={y + 85} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
          OK
        </text>
      </g>

      {/* Bottom Relay Output Grouping Bar */}
      <rect x={x + 2} y={y + height - 29} width={width - 4} height={9} fill="#1f2937" />
      {qGroups.map((q) => (
        <g key={`qg-${q.label}`}>
          <rect
            x={x + width * q.r1 - 6}
            y={y + height - 28}
            width={width * (q.r2 - q.r1) + 12}
            height={7}
            rx={1}
            fill={q.active ? '#16a34a' : '#334155'}
          />
          <text
            x={x + width * q.cxRel}
            y={y + height - 22.8}
            textAnchor="middle"
            fontSize="4.5"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill="#ffffff"
          >
            {q.label} (1-2)
          </text>
        </g>
      ))}

      {/* Bottom Relay Output Terminal Bay */}
      <rect x={x + 2} y={y + height - 19.5} width={width - 4} height={17.5} rx={2} fill="#4b5563" stroke="#1f2937" strokeWidth={0.7} />
      {[0.33, 0.59, 0.81].map((r) => (
        <line key={`qb-${r}`} x1={x + width * r} y1={y + height - 19.5} x2={x + width * r} y2={y + height - 2} stroke="#1f2937" strokeWidth={0.9} />
      ))}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
