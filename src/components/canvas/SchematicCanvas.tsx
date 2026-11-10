import React, { useRef, useState, useEffect } from 'react';
import { ElectricalDevice, ElectricalWire } from '../../types/electrical';
import { generateSchematicModel, SchematicNode } from '../../core/schematicGenerator';
import { SolvedCircuit } from '../../core/circuitSolver';

interface SchematicCanvasProps {
  devices: ElectricalDevice[];
  wires: ElectricalWire[];
  solved: SolvedCircuit;
}

function generateOrthogonalSchematicPath(x1: number, y1: number, x2: number, y2: number): string {
  if (Math.abs(y1 - y2) < 4) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (Math.abs(x1 - x2) < 4) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
    const midX = Math.round((x1 + x2) / 2);
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  } else {
    const midY = Math.round((y1 + y2) / 2);
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }
}

export const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  devices,
  wires,
  solved,
}) => {
  const model = generateSchematicModel(devices, wires);
  const containerRef = useRef<SVGSVGElement | null>(null);

  // Pan and Zoom Camera Controls
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey || isSpacePressed) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(2.5, Math.max(0.4, zoom * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const renderSchematicSymbol = (node: SchematicNode) => {
    switch (node.symbol) {
      case 'meter':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-24} y={-24} width={48} height={48} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} rx={2} />
            <circle cx={0} cy={0} r={18} fill="none" stroke="#0f172a" strokeWidth={1} />
            <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight="bold" fontFamily="monospace">kWh</text>
            <text x={0} y={36} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'breaker':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-15} y={-22} width={30} height={44} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} rx={2} />
            <line x1={-6} y1={-12} x2={6} y2={12} stroke="#dc2626" strokeWidth={2} />
            <text x={0} y={32} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'rcd':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-22} y={-22} width={44} height={44} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} rx={2} />
            <circle cx={0} cy={0} r={12} fill="none" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#0284c7">IΔn</text>
            <text x={0} y={32} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'busbar':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <line x1={0} y1={-40} x2={0} y2={40} stroke="#ca8a04" strokeWidth={5} strokeLinecap="round" />
            <text x={12} y={0} fontSize={8} fontWeight="bold" fill="#713f12">{node.label}</text>
          </g>
        );
      case 'switch':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={-12} cy={0} r={3} fill="#0f172a" />
            <circle cx={12} cy={0} r={3} fill="#0f172a" />
            <line x1={-12} y1={0} x2={8} y2={-12} stroke="#0f172a" strokeWidth={2} />
            <text x={0} y={22} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'light':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={16} fill={node.status === 'ON' ? '#fef08a' : '#f8fafc'} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={-11} y1={-11} x2={11} y2={11} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={-11} y1={11} x2={11} y2={-11} stroke="#0f172a" strokeWidth={1.5} />
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'socket':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <path d="M -14 0 A 14 14 0 0 1 14 0 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} />
            <line x1={-6} y1={0} x2={-6} y2={8} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={6} y1={0} x2={6} y2={8} stroke="#0f172a" strokeWidth={1.5} />
            <text x={0} y={22} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'earth':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <line x1={0} y1={-14} x2={0} y2={0} stroke="#16a34a" strokeWidth={2} />
            <line x1={-14} y1={0} x2={14} y2={0} stroke="#16a34a" strokeWidth={2} />
            <line x1={-9} y1={5} x2={9} y2={5} stroke="#16a34a" strokeWidth={1.8} />
            <line x1={-4} y1={10} x2={4} y2={10} stroke="#16a34a" strokeWidth={1.5} />
            <text x={0} y={24} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#15803d">GND</text>
          </g>
        );
      case 'spd':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-18} y={-22} width={36} height={44} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} rx={2} />
            <path d="M 0 -12 L -6 2 L 2 2 L -2 12" fill="none" stroke="#dc2626" strokeWidth={1.8} strokeLinecap="round" />
            <text x={0} y={32} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">SPD</text>
          </g>
        );
      case 'fan':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={18} fill={node.status === 'ENERGIZED' ? '#e0f2fe' : '#f8fafc'} stroke="#0f172a" strokeWidth={1.5} />
            <path d="M 0 0 C 4 -6, 10 -8, 0 -14 C -6 -8, -3 -4, 0 0 Z" fill="#0284c7" />
            <path d="M 0 0 C 4 -6, 10 -8, 0 -14 C -6 -8, -3 -4, 0 0 Z" fill="#0284c7" transform="rotate(120)" />
            <path d="M 0 0 C 4 -6, 10 -8, 0 -14 C -6 -8, -3 -4, 0 0 Z" fill="#0284c7" transform="rotate(240)" />
            <circle cx={0} cy={0} r={3} fill="#0f172a" />
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'ac':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-26} y={-16} width={52} height={32} rx={3} fill={node.status === 'ENERGIZED' ? '#e0f2fe' : '#f8fafc'} stroke="#0f172a" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#0284c7">A/C 1.5HP</text>
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'heater':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-20} y={-24} width={40} height={48} rx={4} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} />
            <path d="M -10 -8 L -5 0 L 0 -8 L 5 0 L 10 -8" fill="none" stroke="#ea580c" strokeWidth={2} />
            <text x={0} y={12} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#ea580c">3.5kW</text>
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'junction':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <polygon points="-12,-16 12,-16 18,-6 18,10 12,18 -12,18 -18,10 -18,-6" fill="#fff7ed" stroke="#ea580c" strokeWidth={1.5} />
            <circle cx={0} cy={0} r={4} fill="#ea580c" />
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#7c2d12">J-BOX</text>
          </g>
        );
      case 'splice':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <polygon points="-6,-10 6,-10 8,8 -8,8" fill="#ef4444" stroke="#991b1b" strokeWidth={1.2} />
            <text x={0} y={20} textAnchor="middle" fontSize={7.5} fontWeight="bold" fill="#334155">SPLICE</text>
          </g>
        );
      case 'motor':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={22} fill={node.status === 'ENERGIZED' || node.status === 'ON' ? '#dcfce7' : '#f8fafc'} stroke="#0f172a" strokeWidth={2} />
            <text x={0} y={-4} textAnchor="middle" fontSize={14} fontWeight="900" fill="#0f172a" fontFamily="monospace">M</text>
            <text x={0} y={11} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#16a34a" fontFamily="monospace">3 ~</text>
            <text x={0} y={36} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'contactor':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-26} y={-24} width={52} height={48} rx={3} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} />
            {/* 3 Main power contact poles */}
            <line x1={-14} y1={-18} x2={-14} y2={-6} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={-14} y1={-6} x2={-8} y2={6} stroke="#0f172a" strokeWidth={1.8} />
            <line x1={-14} y1={6} x2={-14} y2={18} stroke="#0f172a" strokeWidth={1.5} />

            <line x1={0} y1={-18} x2={0} y2={-6} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={0} y1={-6} x2={6} y2={6} stroke="#0f172a" strokeWidth={1.8} />
            <line x1={0} y1={6} x2={0} y2={18} stroke="#0f172a" strokeWidth={1.5} />

            <line x1={14} y1={-18} x2={14} y2={-6} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={14} y1={-6} x2={20} y2={6} stroke="#0f172a" strokeWidth={1.8} />
            <line x1={14} y1={6} x2={14} y2={18} stroke="#0f172a" strokeWidth={1.5} />

            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">KM ({node.label})</text>
          </g>
        );
      case 'relay':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-22} y={-22} width={44} height={44} rx={3} fill={node.status === 'ENERGIZED' || node.status === 'ON' ? '#f5f3ff' : '#f8fafc'} stroke="#7c3aed" strokeWidth={1.5} />
            {/* Coil rectangle with diagonal */}
            <rect x={-14} y={-14} width={28} height={16} fill="none" stroke="#7c3aed" strokeWidth={1.2} />
            <line x1={-14} y1={-14} x2={14} y2={2} stroke="#7c3aed" strokeWidth={1.2} />
            <text x={0} y={15} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#7c3aed">KA / DPDT</text>
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'pushbutton':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-24} y={-18} width={48} height={36} rx={3} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5} />
            {/* Start NO button symbol */}
            <circle cx={-10} cy={-4} r={2} fill="#16a34a" />
            <circle cx={-2} cy={-4} r={2} fill="#16a34a" />
            <line x1={-10} y1={-4} x2={-2} y2={-10} stroke="#16a34a" strokeWidth={1.5} />
            {/* Stop NC button symbol */}
            <circle cx={6} cy={-4} r={2} fill="#dc2626" />
            <circle cx={14} cy={-4} r={2} fill="#dc2626" />
            <line x1={6} y1={-4} x2={14} y2={-4} stroke="#dc2626" strokeWidth={1.5} />
            <text x={0} y={12} textAnchor="middle" fontSize={7.5} fontWeight="bold" fill="#334155">START/STOP</text>
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'estop':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={18} fill="#fef08a" stroke="#ca8a04" strokeWidth={1.5} />
            <circle cx={0} cy={0} r={11} fill="#ef4444" stroke="#991b1b" strokeWidth={1.5} />
            <line x1={-6} y1={-6} x2={6} y2={6} stroke="#ffffff" strokeWidth={2} />
            <line x1={-6} y1={6} x2={6} y2={-6} stroke="#ffffff" strokeWidth={2} />
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#dc2626">E-STOP</text>
          </g>
        );
      case 'pilot':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={15} fill={node.status === 'ENERGIZED' || node.status === 'ON' ? '#bbf7d0' : '#f8fafc'} stroke="#0f172a" strokeWidth={1.5} />
            {/* 4 Radiating light rays */}
            <line x1={-10} y1={-10} x2={10} y2={10} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={-10} y1={10} x2={10} y2={-10} stroke="#0f172a" strokeWidth={1.5} />
            <line x1={-18} y1={-6} x2={-23} y2={-8} stroke="#16a34a" strokeWidth={1.2} />
            <line x1={-18} y1={0} x2={-24} y2={0} stroke="#16a34a" strokeWidth={1.2} />
            <line x1={18} y1={-6} x2={23} y2={-8} stroke="#16a34a" strokeWidth={1.2} />
            <line x1={18} y1={0} x2={24} y2={0} stroke="#16a34a" strokeWidth={1.2} />
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      case 'plc':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-32} y={-26} width={64} height={52} rx={4} fill="#f1f5f9" stroke="#0284c7" strokeWidth={2} />
            <rect x={-20} y={-10} width={40} height={20} rx={2} fill="#e0f2fe" stroke="#38bdf8" strokeWidth={1} />
            <text x={0} y={-16} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#0284c7" fontFamily="monospace">I1 I2 I3 I4</text>
            <text x={0} y={3} textAnchor="middle" fontSize={8} fontWeight="900" fill="#0369a1" fontFamily="monospace">PLC-CPU</text>
            <text x={0} y={20} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#ea580c" fontFamily="monospace">Q1 Q2 Q3 Q4</text>
            <text x={0} y={38} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#334155">{node.label}</text>
          </g>
        );
      default:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={10} fill="#cbd5e1" stroke="#0f172a" />
            <text x={0} y={20} textAnchor="middle" fontSize={8}>{node.label}</text>
          </g>
        );
    }
  };

  return (
    <div className="relative w-full h-full bg-[#f8fafc] overflow-hidden select-none">
      {/* Schematic Top Bar Info */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 border border-slate-200/90 rounded-xl px-4 py-2 shadow-sm backdrop-blur-md">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
          Single-Line Diagram (SLD) / Engineering Schematic
        </h2>
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 mt-0.5">
          <span>IEC 60617 / IEEE Standard</span>
          <span>Nodes: {devices.length}</span>
          <span>Interconnections: {wires.length}</span>
          <span>Load: {solved.totalWatts.toFixed(0)}W</span>
        </div>
      </div>

      {/* Zoom / Pan Controls HUD */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/95 border border-slate-200/90 rounded-xl p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition"
          title="Zoom In"
        >
          +
        </button>
        <span className="text-xs font-mono text-slate-600 w-12 text-center font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded-lg font-medium transition"
          title="Reset Camera View"
        >
          Reset
        </button>
      </div>

      <svg
        ref={containerRef}
        className={`w-full h-full ${
          isSpacePressed
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : isPanning
            ? 'cursor-grabbing'
            : 'cursor-default'
        }`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="schematicGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#cbd5e1" />
          </pattern>
        </defs>

        <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#schematicGrid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Orthogonal Schematic Connections */}
          <g id="schematic-edges">
            {model.edges.map((edge) => {
              const fromNode = model.nodes.find(n => n.id === edge.fromId);
              const toNode = model.nodes.find(n => n.id === edge.toId);
              if (!fromNode || !toNode) return null;

              let strokeColor = '#0f172a';
              if (edge.type === 'neutral') strokeColor = '#2563eb';
              else if (edge.type === 'earth') strokeColor = '#16a34a';
              else if (edge.type === 'control') strokeColor = '#ca8a04';

              const d = generateOrthogonalSchematicPath(fromNode.x, fromNode.y, toNode.x, toNode.y);

              return (
                <g key={edge.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2}
                    strokeDasharray={edge.type === 'earth' ? '4 2' : 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Connection Node Terminals */}
                  <circle cx={fromNode.x} cy={fromNode.y} r={3} fill={strokeColor} />
                  <circle cx={toNode.x} cy={toNode.y} r={3} fill={strokeColor} />
                </g>
              );
            })}
          </g>

          {/* Schematic Symbols */}
          <g id="schematic-nodes">
            {model.nodes.map((node) => (
              <React.Fragment key={node.id}>
                {renderSchematicSymbol(node)}
              </React.Fragment>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};
