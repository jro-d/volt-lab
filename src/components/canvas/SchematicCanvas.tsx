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

  // Block page scroll while wheel-zooming (React's onWheel is passive, so use a native listener)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const block = (ev: WheelEvent) => ev.preventDefault();
    el.addEventListener('wheel', block, { passive: false });
    return () => el.removeEventListener('wheel', block);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
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
            <rect x={-24} y={-24} width={48} height={48} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <circle cx={0} cy={0} r={18} fill="none" stroke="var(--ink)" strokeWidth={1} />
            <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight="bold" fontFamily="var(--font-mono)">kWh</text>
            <text x={0} y={36} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'breaker':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-15} y={-22} width={30} height={44} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <line x1={-6} y1={-12} x2={6} y2={12} stroke="var(--danger)" strokeWidth={2} />
            <text x={0} y={32} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'rcd':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-22} y={-22} width={44} height={44} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <circle cx={0} cy={0} r={12} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--ink)">IΔn</text>
            <text x={0} y={32} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'busbar':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <line x1={0} y1={-40} x2={0} y2={40} stroke="var(--warning)" strokeWidth={5} strokeLinecap="round" />
            <text x={12} y={0} fontSize={8} fontWeight="bold" fill="var(--warning)">{node.label}</text>
          </g>
        );
      case 'switch':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={-12} cy={0} r={3} fill="var(--ink)" />
            <circle cx={12} cy={0} r={3} fill="var(--ink)" />
            <line x1={-12} y1={0} x2={8} y2={-12} stroke="var(--ink)" strokeWidth={2} />
            <text x={0} y={22} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'light':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={16} fill={node.status === 'ON' ? 'var(--lamp-white-on)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={-11} y1={-11} x2={11} y2={11} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={-11} y1={11} x2={11} y2={-11} stroke="var(--ink)" strokeWidth={1.5} />
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'socket':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <path d="M -14 0 A 14 14 0 0 1 14 0 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={-6} y1={0} x2={-6} y2={8} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={6} y1={0} x2={6} y2={8} stroke="var(--ink)" strokeWidth={1.5} />
            <text x={0} y={22} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'earth':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <line x1={0} y1={-14} x2={0} y2={0} stroke="var(--ok)" strokeWidth={2} />
            <line x1={-14} y1={0} x2={14} y2={0} stroke="var(--ok)" strokeWidth={2} />
            <line x1={-9} y1={5} x2={9} y2={5} stroke="var(--ok)" strokeWidth={1.8} />
            <line x1={-4} y1={10} x2={4} y2={10} stroke="var(--ok)" strokeWidth={1.5} />
            <text x={0} y={24} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ok)">GND</text>
          </g>
        );
      case 'spd':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-18} y={-22} width={36} height={44} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <path d="M 0 -12 L -6 2 L 2 2 L -2 12" fill="none" stroke="var(--danger)" strokeWidth={1.8} strokeLinecap="round" />
            <text x={0} y={32} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">SPD</text>
          </g>
        );
      case 'fan':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={18} fill={node.status === 'ENERGIZED' ? 'var(--ok-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} />
            <path d="M 0 0 C 4 -6, 10 -8, 0 -14 C -6 -8, -3 -4, 0 0 Z" fill="var(--ink)" />
            <path d="M 0 0 C 4 -6, 10 -8, 0 -14 C -6 -8, -3 -4, 0 0 Z" fill="var(--ink)" transform="rotate(120)" />
            <path d="M 0 0 C 4 -6, 10 -8, 0 -14 C -6 -8, -3 -4, 0 0 Z" fill="var(--ink)" transform="rotate(240)" />
            <circle cx={0} cy={0} r={3} fill="var(--ink)" />
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'ac':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-26} y={-16} width={52} height={32} rx={3} fill={node.status === 'ENERGIZED' ? 'var(--ok-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--ink)">A/C 1.5HP</text>
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'heater':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-20} y={-24} width={40} height={48} rx={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
            <path d="M -10 -8 L -5 0 L 0 -8 L 5 0 L 10 -8" fill="none" stroke="var(--warning)" strokeWidth={2} />
            <text x={0} y={12} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--warning)">3.5kW</text>
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'junction':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <polygon points="-12,-16 12,-16 18,-6 18,10 12,18 -12,18 -18,10 -18,-6" fill="var(--warning-soft)" stroke="var(--warning)" strokeWidth={1.5} />
            <circle cx={0} cy={0} r={4} fill="var(--warning)" />
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--warning)">J-BOX</text>
          </g>
        );
      case 'splice':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <polygon points="-6,-10 6,-10 8,8 -8,8" fill="var(--danger)" stroke="var(--danger)" strokeWidth={1.2} />
            <text x={0} y={20} textAnchor="middle" fontSize={7.5} fontWeight="bold" fill="var(--ink-muted)">SPLICE</text>
          </g>
        );
      case 'motor':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={22} fill={node.status === 'ENERGIZED' || node.status === 'ON' ? 'var(--ok-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={2} />
            <text x={0} y={-4} textAnchor="middle" fontSize={14} fontWeight="900" fill="var(--ink)" fontFamily="var(--font-mono)">M</text>
            <text x={0} y={11} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--ok)" fontFamily="var(--font-mono)">3 ~</text>
            <text x={0} y={36} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'contactor':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-26} y={-24} width={52} height={48} rx={3} fill={node.status === 'ON' ? 'var(--ok-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} />
            {/* 3 Main power contact poles */}
            <line x1={-14} y1={-18} x2={-14} y2={-6} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={-14} y1={-6} x2={-8} y2={6} stroke="var(--ink)" strokeWidth={1.8} />
            <line x1={-14} y1={6} x2={-14} y2={18} stroke="var(--ink)" strokeWidth={1.5} />

            <line x1={0} y1={-18} x2={0} y2={-6} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={0} y1={-6} x2={6} y2={6} stroke="var(--ink)" strokeWidth={1.8} />
            <line x1={0} y1={6} x2={0} y2={18} stroke="var(--ink)" strokeWidth={1.5} />

            <line x1={14} y1={-18} x2={14} y2={-6} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={14} y1={-6} x2={20} y2={6} stroke="var(--ink)" strokeWidth={1.8} />
            <line x1={14} y1={6} x2={14} y2={18} stroke="var(--ink)" strokeWidth={1.5} />

            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">KM ({node.label})</text>
          </g>
        );
      case 'relay':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-22} y={-22} width={44} height={44} rx={3} fill={node.status === 'ENERGIZED' || node.status === 'ON' ? 'var(--surface-sunken)' : 'var(--surface)'} stroke="var(--port-control)" strokeWidth={1.5} />
            {/* Coil rectangle with diagonal */}
            <rect x={-14} y={-14} width={28} height={16} fill="none" stroke="var(--port-control)" strokeWidth={1.2} />
            <line x1={-14} y1={-14} x2={14} y2={2} stroke="var(--port-control)" strokeWidth={1.2} />
            <text x={0} y={15} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--port-control)">KA / DPDT</text>
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'pushbutton':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-24} y={-18} width={48} height={36} rx={3} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
            {/* Start NO button symbol */}
            <circle cx={-10} cy={-4} r={2} fill="var(--ok)" />
            <circle cx={-2} cy={-4} r={2} fill="var(--ok)" />
            <line x1={-10} y1={-4} x2={-2} y2={-10} stroke="var(--ok)" strokeWidth={1.5} />
            {/* Stop NC button symbol */}
            <circle cx={6} cy={-4} r={2} fill="var(--danger)" />
            <circle cx={14} cy={-4} r={2} fill="var(--danger)" />
            <line x1={6} y1={-4} x2={14} y2={-4} stroke="var(--danger)" strokeWidth={1.5} />
            <text x={0} y={12} textAnchor="middle" fontSize={7.5} fontWeight="bold" fill="var(--ink-muted)">START/STOP</text>
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'estop':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={18} fill="var(--lamp-white-on)" stroke="var(--warning)" strokeWidth={1.5} />
            <circle cx={0} cy={0} r={11} fill="var(--danger)" stroke="var(--danger)" strokeWidth={1.5} />
            <line x1={-6} y1={-6} x2={6} y2={6} stroke="var(--surface)" strokeWidth={2} />
            <line x1={-6} y1={6} x2={6} y2={-6} stroke="var(--surface)" strokeWidth={2} />
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--danger)">E-STOP</text>
          </g>
        );
      case 'pilot':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={15} fill={node.status === 'ENERGIZED' || node.status === 'ON' ? 'var(--ok-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} />
            {/* 4 Radiating light rays */}
            <line x1={-10} y1={-10} x2={10} y2={10} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={-10} y1={10} x2={10} y2={-10} stroke="var(--ink)" strokeWidth={1.5} />
            <line x1={-18} y1={-6} x2={-23} y2={-8} stroke="var(--ok)" strokeWidth={1.2} />
            <line x1={-18} y1={0} x2={-24} y2={0} stroke="var(--ok)" strokeWidth={1.2} />
            <line x1={18} y1={-6} x2={23} y2={-8} stroke="var(--ok)" strokeWidth={1.2} />
            <line x1={18} y1={0} x2={24} y2={0} stroke="var(--ok)" strokeWidth={1.2} />
            <text x={0} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'plc':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-32} y={-26} width={64} height={52} rx={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
            <rect x={-20} y={-10} width={40} height={20} rx={2} fill="var(--ok-soft)" stroke="var(--ink)" strokeWidth={1} />
            <text x={0} y={-16} textAnchor="middle" fontSize={7} fontWeight="bold" fill="var(--ink)" fontFamily="var(--font-mono)">I1 I2 I3 I4</text>
            <text x={0} y={3} textAnchor="middle" fontSize={8} fontWeight="900" fill="var(--ink)" fontFamily="var(--font-mono)">PLC-CPU</text>
            <text x={0} y={20} textAnchor="middle" fontSize={7} fontWeight="bold" fill="var(--warning)" fontFamily="var(--font-mono)">Q1 Q2 Q3 Q4</text>
            <text x={0} y={38} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'tor':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-26} y={-22} width={52} height={44} rx={3} fill={node.status === 'TRIPPED' ? 'var(--warning-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} />
            {/* IEC thermal element symbol (square wave) on each pole */}
            {[-14, 0, 14].map((px) => (
              <path key={px} d={`M ${px} -18 L ${px} -8 L ${px - 4} -8 L ${px - 4} 4 L ${px + 4} 4 L ${px + 4} -8 L ${px} -8 M ${px} 4 L ${px} 18`} fill="none" stroke="var(--ink)" strokeWidth={1.3} />
            ))}
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">OLR 95-96 / 97-98</text>
            <text x={0} y={44} textAnchor="middle" fontSize={7.5} fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'transformer':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={-9} r={13} fill="none" stroke="var(--ink)" strokeWidth={1.6} />
            <circle cx={0} cy={9} r={13} fill={node.status === 'ON' ? 'var(--ok-soft)' : 'none'} fillOpacity={0.6} stroke="var(--ink)" strokeWidth={1.6} />
            <text x={20} y={-6} fontSize={8} fontWeight="bold" fill="var(--danger)" fontFamily="var(--font-mono)">440V</text>
            <text x={20} y={14} fontSize={8} fontWeight="bold" fill="var(--cond-blue)" fontFamily="var(--font-mono)">220V</text>
            <text x={0} y={36} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'source3p':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={22} fill="var(--warning-soft)" stroke="var(--ink)" strokeWidth={2} />
            <path d="M -12 0 Q -6 -10 0 0 T 12 0" fill="none" stroke="var(--ink)" strokeWidth={1.6} />
            <text x={0} y={14} textAnchor="middle" fontSize={8} fontWeight="900" fill="var(--ink)" fontFamily="var(--font-mono)">3~ 440V</text>
            <text x={0} y={36} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'fuse':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            {/* IEC 60617 fuse: rectangle with the conductor running through it */}
            <rect x={-9} y={-22} width={18} height={44} fill={node.status === 'TRIPPED' ? 'var(--danger-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={1.5} rx={1.5} />
            <line x1={0} y1={-30} x2={0} y2={30} stroke="var(--ink)" strokeWidth={1.5} />
            <text x={0} y={42} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'generator':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={22} fill={node.status === 'ON' ? 'var(--ok-soft)' : 'var(--surface)'} stroke="var(--ink)" strokeWidth={2} />
            <text x={0} y={-3} textAnchor="middle" fontSize={13} fontWeight="900" fill="var(--ink)" fontFamily="var(--font-mono)">G</text>
            <path d="M -8 8 Q -4 0 0 8 T 8 8" fill="none" stroke="var(--ink)" strokeWidth={1.6} />
            <text x={0} y={36} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'pv':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-22} y={-18} width={44} height={36} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <path d="M -22 -6 H 22 M -22 6 H 22 M -7 -18 V 18 M 7 -18 V 18" stroke="var(--ink)" strokeWidth={1} />
            <path d="M -30 -26 L -22 -18 M -34 -16 L -24 -12" stroke="var(--warning)" strokeWidth={1.6} />
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'inverter':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-24} y={-20} width={48} height={40} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <line x1={-24} y1={20} x2={24} y2={-20} stroke="var(--ink)" strokeWidth={1.2} />
            <text x={-12} y={-6} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--ink)">=</text>
            <text x={12} y={14} textAnchor="middle" fontSize={10} fontWeight="bold" fill="var(--ink)">~</text>
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'battery':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-24} y={-20} width={48} height={40} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <path d="M -8 -8 V 8 M -2 -12 V 12 M 4 -8 V 8 M 10 -12 V 12" stroke="var(--ink)" strokeWidth={1.8} />
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'capacitor':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-22} y={-20} width={44} height={40} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} rx={2} />
            <path d="M -14 -3 H 14 M -14 3 H 14 M 0 -20 V -3 M 0 3 V 20" stroke="var(--ink)" strokeWidth={1.8} />
            <text x={0} y={34} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      case 'pushbutton3':
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect x={-30} y={-18} width={60} height={36} rx={3} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
            {[
              { x: -18, c: 'var(--danger)', nc: true },
              { x: 0, c: 'var(--ok)', nc: false },
              { x: 18, c: 'var(--warning)', nc: false },
            ].map((b) => (
              <g key={b.x}>
                <circle cx={b.x - 4} cy={-2} r={1.8} fill={b.c} />
                <circle cx={b.x + 4} cy={-2} r={1.8} fill={b.c} />
                <line x1={b.x - 4} y1={-2} x2={b.x + 4} y2={b.nc ? -2 : -8} stroke={b.c} strokeWidth={1.5} />
              </g>
            ))}
            <text x={0} y={12} textAnchor="middle" fontSize={7} fontWeight="bold" fill="var(--ink-muted)">STOP · FWD · REV</text>
            <text x={0} y={30} textAnchor="middle" fontSize={8} fontWeight="bold" fill="var(--ink-muted)">{node.label}</text>
          </g>
        );
      default:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <circle cx={0} cy={0} r={10} fill="var(--border-strong)" stroke="var(--ink)" />
            <text x={0} y={20} textAnchor="middle" fontSize={8}>{node.label}</text>
          </g>
        );
    }
  };

  return (
    <div className="relative w-full h-full bg-canvas overflow-hidden select-none">
      {/* Schematic Top Bar Info */}
      <div className="absolute top-4 left-4 z-10 bg-surface/95 border border-border/90 rounded-md px-4 py-2 shadow-sm backdrop-blur-md">
        <h2 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
          Single-Line Diagram (SLD) / Engineering Schematic
        </h2>
        <div className="flex items-center gap-4 text-[11px] font-mono text-ink-muted mt-0.5">
          <span>IEC 60617 / IEEE Standard</span>
          <span>Nodes: {devices.length}</span>
          <span>Interconnections: {wires.length}</span>
          <span>Load: {solved.totalWatts.toFixed(0)}W</span>
        </div>
      </div>

      {/* Zoom / Pan Controls HUD */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-surface/95 border border-border/90 rounded-md p-1.5 shadow-2 backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="w-7 h-7 flex items-center justify-center bg-surface-sunken hover:bg-border text-ink rounded-lg font-bold text-sm transition"
          title="Zoom In"
        >
          +
        </button>
        <span className="text-xs font-mono text-ink-muted w-12 text-center font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="w-7 h-7 flex items-center justify-center bg-surface-sunken hover:bg-border text-ink rounded-lg font-bold text-sm transition"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2.5 py-1 bg-surface-sunken hover:bg-border text-xs text-ink-muted rounded-lg font-medium transition"
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
            <circle cx="1" cy="1" r="0.8" fill="var(--border-strong)" />
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

              let strokeColor = 'var(--ink)';
              if (edge.type === 'neutral') strokeColor = 'var(--cond-blue)';
              else if (edge.type === 'earth') strokeColor = 'var(--ok)';
              else if (edge.type === 'control') strokeColor = 'var(--warning)';

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
