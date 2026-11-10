import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface PlcDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const PlcDevice: React.FC<PlcDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isRunning = device.state.plcRunning !== false;
  const inputs = device.state.plcInputs || {};
  const outputs = device.state.plcOutputs || {};

  const handleToggleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      onToggleState({
        ...device,
        state: {
          ...device.state,
          plcRunning: !isRunning,
        }
      });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      {/* PLC Main Enclosure (Industrial Slate DIN Rail Module) */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth={1.8}
        filter="drop-shadow(0 8px 20px rgba(0,0,0,0.18))"
      />

      {/* Ventilation Louvers */}
      {[20, 24, 28].map((ly, i) => (
        <line key={i} x1={x + 10} y1={y + ly} x2={x + 36} y2={y + ly} stroke="#334155" strokeWidth={1} />
      ))}

      {/* Diagnostic LCD Display Window */}
      <rect
        x={x + 42}
        y={y + 24}
        width={72}
        height={44}
        rx={3}
        fill={isRunning ? "#14532d" : "#0f172a"}
        stroke="#334155"
        strokeWidth={1.2}
      />
      {/* LCD Backlight Grid */}
      <rect
        x={x + 44}
        y={y + 26}
        width={68}
        height={40}
        fill={isRunning ? "#22c55e" : "#1e293b"}
        opacity={isRunning ? 0.85 : 0.4}
      />

      {/* LCD Text Content */}
      <text x={x + 48} y={y + 36} fontSize="6" fontWeight="bold" fontFamily="monospace" fill="#052e16">
        {isRunning ? "PLC: RUN (AUTO)" : "PLC: STOPPED"}
      </text>
      <text x={x + 48} y={y + 47} fontSize="5" fontWeight="bold" fontFamily="monospace" fill="#052e16">
        IN:  [{inputs.i1 ? '1' : '0'} {inputs.i2 ? '1' : '0'} {inputs.i3 ? '1' : '0'} {inputs.i4 ? '1' : '0'}]
      </text>
      <text x={x + 48} y={y + 58} fontSize="5" fontWeight="bold" fontFamily="monospace" fill="#052e16">
        OUT: [{outputs.q1 ? '1' : '0'} {outputs.q2 ? '1' : '0'} {outputs.q3 ? '1' : '0'} {outputs.q4 ? '1' : '0'}]
      </text>

      {/* Input LED Status Strip (I1..I4) */}
      <g transform={`translate(${x + 42}, ${y + 15})`}>
        {['i1', 'i2', 'i3', 'i4'].map((inp, idx) => {
          const active = !!inputs[inp];
          return (
            <g key={inp} transform={`translate(${idx * 18 + 6}, 0)`}>
              <circle r={2.5} fill={active ? "#22c55e" : "#334155"} stroke="#0f172a" strokeWidth={0.5} />
              {active && <circle r={4.5} fill="#22c55e" opacity={0.5} className="animate-pulse" />}
              <text x={0} y={-4} textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#94a3b8">
                {inp.toUpperCase()}
              </text>
            </g>
          );
        })}
      </g>

      {/* Output LED Status Strip (Q1..Q4) */}
      <g transform={`translate(${x + 42}, ${y + 76})`}>
        {['q1', 'q2', 'q3', 'q4'].map((outp, idx) => {
          const active = !!outputs[outp];
          return (
            <g key={outp} transform={`translate(${idx * 18 + 6}, 0)`}>
              <circle r={2.5} fill={active ? "#f97316" : "#334155"} stroke="#0f172a" strokeWidth={0.5} />
              {active && <circle r={4.5} fill="#f97316" opacity={0.5} className="animate-pulse" />}
              <text x={0} y={9} textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#94a3b8">
                {outp.toUpperCase()}
              </text>
            </g>
          );
        })}
      </g>

      {/* RUN / STOP Toggle Switch */}
      <g
        transform={`translate(${x + 124}, ${y + 36})`}
        onClick={handleToggleRun}
        className="cursor-pointer group"
      >
        <title>CPU RUN/STOP Mode Switch</title>
        <rect x="0" y="0" width="22" height="14" rx="2" fill="#0f172a" stroke="#475569" strokeWidth={0.8} />
        {/* Toggle Slider Knob */}
        <rect
          x={isRunning ? 11 : 2}
          y="2"
          width="9"
          height="10"
          rx="1"
          fill={isRunning ? "#22c55e" : "#ef4444"}
          className="transition-all duration-150"
        />
        <text x="11" y="22" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#94a3b8">
          {isRunning ? "RUN" : "STOP"}
        </text>
      </g>

      {/* PLC Brand Model Badge */}
      <text x={x + 22} y={y + 54} textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="sans-serif" fill="#f8fafc">
        MICRO-PLC
      </text>
      <text x={x + 22} y={y + 62} textAnchor="middle" fontSize="5" fontWeight="bold" fontFamily="monospace" fill="#38bdf8">
        LOGIC 230RC
      </text>

      {/* Terminal Screw Points (Top Inputs + Bottom Outputs) */}
      {device.terminals.map((terminal) => {
        const tx = x + width * terminal.relX;
        const ty = y + height * terminal.relY;
        const termKey = `${device.id}:${terminal.id}`;

        return (
          <g key={terminal.id}>
            <TerminalPoint
              terminal={terminal}
              x={tx}
              y={ty}
              isHovered={hoveredTerminalId === termKey}
              isSelected={selectedTerminalId === termKey}
              onMouseDown={(e) => onTerminalMouseDown(device, terminal, e)}
              onMouseEnter={() => setHoveredTerminalId(termKey)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
            {/* Terminal Pin Label */}
            <text
              x={tx}
              y={terminal.relY < 0.5 ? ty + 12 : ty - 8}
              textAnchor="middle"
              fontSize="5.5"
              fontWeight="bold"
              fontFamily="monospace"
              fill={terminal.id.includes('i') ? '#06b6d4' : terminal.id.includes('q') ? '#f97316' : '#94a3b8'}
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
