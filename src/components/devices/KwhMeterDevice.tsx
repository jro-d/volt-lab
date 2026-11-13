import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style Digital Kilowatt-Hour Utility Meter (1P / 3P).
 * Flat CAD metering housing, crisp backlit LCD telemetry display, impulse LED,
 * and embedded L/N/N/L bottom terminal pocket band with zero overlap.
 */
export const KwhMeterDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height, type } = device;
  const is3P = type === 'kwh_meter_3p';
  const cx = x + width / 2;
  const voltage = Number(device.state.voltageIn ?? 230);
  const kwhVal = Number(device.state.kwh ?? 123.45).toFixed(2).padStart(7, '0');
  const freq = Number(device.state.frequency ?? 60);
  const isEnergized = device.state.energized !== false;

  const botLabels: Array<{ relX: number; text: string; color: string }> = [
    { relX: 0.22, text: 'L IN', color: '#f87171' },
    { relX: 0.40, text: 'N IN', color: '#60a5fa' },
    { relX: 0.60, text: 'N OUT', color: '#60a5fa' },
    { relX: 0.78, text: 'L OUT', color: '#f87171' },
  ];

  return (
    <g className="select-none">
      {/* Subtle Architectural CAD Shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={6} fill="rgba(15, 23, 42, 0.16)" />

      {/* Top Mounting Lug Tab */}
      <rect x={cx - 11} y={y - 5} width={22} height={7} rx={2} fill="#64748b" stroke="#0f172a" strokeWidth={1} />
      <circle cx={cx} cy={y - 2} r={2} fill="#e2e8f0" stroke="#334155" strokeWidth={0.7} />

      {/* Main Molded Meter Housing */}
      <rect x={x} y={y} width={width} height={height} rx={6} fill="#e5e7eb" stroke="#0f172a" strokeWidth={1.4} />

      {/* Top Dark EduVolt / Utility Banner */}
      <rect x={x + 3} y={y + 3} width={width - 6} height={19} rx={3} fill="#111827" />
      <text x={x + 9} y={y + 13} fontSize="6" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#ffffff">
        VoltLab
      </text>
      <text x={x + width - 9} y={y + 13} textAnchor="end" fontSize="5" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#38bdf8">
        {is3P ? '3Φ METER' : 'kWh 230V'}
      </text>
      <text x={x + 9} y={y + 19.5} fontSize="4.1" fontWeight="700" fontFamily="ui-monospace, monospace" fill="#94a3b8">
        CLASS 1.0 · IEC 62053-21
      </text>

      {/* Recessed LCD Telemetry Window */}
      <rect x={x + 10} y={y + 27} width={width - 20} height={48} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1.1} />
      <rect x={x + 14} y={y + 31} width={width - 28} height={36} rx={2} fill={isEnergized ? '#ecfccb' : '#cbd5e1'} stroke="#365314" strokeWidth={0.8} />

      {/* Top LCD Telemetry Header */}
      <text x={x + 18} y={y + 39} fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1a2e05">
        {device.state.tag || 'MTR-01'}
      </text>
      <text x={x + width - 18} y={y + 39} textAnchor="end" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#365314">
        {voltage}V · {freq}Hz
      </text>

      {/* Main kWh Readout */}
      <text x={cx + 22} y={y + 56} textAnchor="end" fontSize="12.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a" letterSpacing="0.8">
        {kwhVal}
      </text>
      <text x={x + width - 18} y={y + 56} textAnchor="end" fontSize="6.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#365314">
        kWh
      </text>

      {/* Impulse LED & Calibration Bar */}
      <circle cx={x + 22} cy={y + 88} r={3.2} fill={isEnergized ? '#ef4444' : '#475569'} stroke="#0f172a" strokeWidth={0.7} />
      {isEnergized && <circle cx={x + 22} cy={y + 88} r={5.5} fill="#ef4444" opacity={0.28} className="animate-ping" />}
      <text x={x + 29} y={y + 89.8} fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1e293b">
        1600 imp/kWh
      </text>

      {/* IEC Optical Probe & Nameplate Specs */}
      <circle cx={x + width - 22} cy={y + 92} r={8.5} fill="#334155" stroke="#0f172a" strokeWidth={0.9} />
      <circle cx={x + width - 22} cy={y + 92} r={4.5} fill="#0f172a" />
      <rect x={x + 10} y={y + 102} width={width - 42} height={24} rx={2} fill="#f8fafc" stroke="#94a3b8" strokeWidth={0.8} />
      <text x={x + 14} y={y + 111.5} fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
        {is3P ? '3×230/400V 10(100)A' : '1Φ2W 230V 10(60)A'}
      </text>
      <text x={x + 14} y={y + 120.5} fontSize="4.2" fontWeight="700" fontFamily="ui-monospace, monospace" fill="#475569">
        UTILITY REVENUE SEAL
      </text>

      {/* Embedded Bottom Silkscreen Label Band */}
      <rect x={x + 4} y={y + height - 39} width={width - 8} height={11} fill="#111827" />
      {botLabels.map((lbl) => (
        <text
          key={`km-${lbl.text}`}
          x={x + width * lbl.relX}
          y={y + height - 31.5}
          textAnchor="middle"
          fontSize="4.8"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill={lbl.color}
        >
          {lbl.text}
        </text>
      ))}

      {/* Bottom Terminal Cover & Screw Bay */}
      <rect x={x + 4} y={y + height - 28} width={width - 8} height={25} rx={2.5} fill="#1f2937" stroke="#0f172a" strokeWidth={1} />
      {[0.31, 0.50, 0.69].map((r) => (
        <line key={`md-${r}`} x1={x + width * r} y1={y + height - 28} x2={x + width * r} y2={y + height - 3} stroke="#475569" strokeWidth={0.8} />
      ))}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
