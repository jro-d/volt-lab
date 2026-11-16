import React from 'react';
import { COMPONENT_CATALOG, createDeviceFromCatalog } from '../data/defaultComponents';
import { DeviceRenderer } from '../components/devices/DeviceRenderer';

/**
 * Dev-only sheet of every device in the catalogue, drawn by the real renderers.
 * Open http://localhost:5174/?gallery (add &dark for the dark theme, &scale=3 to zoom).
 * Not included in production builds.
 */
export const DeviceGallery: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const scale = Number(params.get('scale') || 2);
  const only = params.get('only');
  const pad = 24;
  const cols = Number(params.get('cols') || 6);
  const items = COMPONENT_CATALOG.filter((c) => !only || only.split(',').some((o) => c.type.includes(o)));

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', params.has('dark'));
  }, []);

  const cellW = 200;
  const rows: { def: (typeof items)[number]; x: number; y: number }[] = [];
  let x = pad;
  let y = pad;
  let rowH = 0;
  items.forEach((def, i) => {
    if (i > 0 && i % cols === 0) {
      x = pad;
      y += rowH + 40;
      rowH = 0;
    }
    rows.push({ def, x, y: y + 14 });
    rowH = Math.max(rowH, def.height + 14);
    x += Math.max(cellW, def.width + 30);
  });
  const W = Math.max(...rows.map((r) => r.x + Math.max(cellW, r.def.width + 30))) + pad;
  const H = y + rowH + 40;
  const noop = () => {};

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'auto', background: 'var(--canvas)' }}>
      <svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`}>
        {rows.map(({ def, x: dx, y: dy }) => {
          const device = createDeviceFromCatalog(def.type, dx, dy, `g-${def.type}`);
          return (
            <g key={def.type}>
              <text x={dx} y={dy - 6} fontSize={8} fill="var(--ink-muted)" fontFamily="var(--font-mono)">
                {def.type}
              </text>
              <DeviceRenderer
                device={device}
                onDeviceMouseDown={noop}
                onTerminalMouseDown={noop}
                setHoveredTerminalId={noop}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
