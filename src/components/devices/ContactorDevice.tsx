import React from 'react';
import { DeviceComponentProps, DeviceTerminals, momentaryPress, stopCanvas, SvgPill } from './DeviceTerminals';

/**
 * EduVolt-style 3-Pole Magnetic Contactor + Front-Mounted LADN11 Aux (1NO + 1NC).
 * Pure flat CAD geometry with embedded top/bottom silkscreen bands so labels never collide.
 */
export const ContactorDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const coilOn = !!device.state.coilEnergized;
  const isClosed = coilOn || !!device.state.manualOverride;
  const isCutaway = !!device.state.cutaway;
  const mainW = width * 0.69;
  const auxX = x + width * 0.70;
  const auxW = width * 0.30;
  const uid = device.id.replace(/[^a-zA-Z0-9]/g, '');

  const poleXs = [0.25, 0.41, 0.57].map((r) => x + width * r);
  const topBayH = 19;
  const topLabelY = 20;
  const bandY = 29;
  const bandH = 13;
  const botLabelY = height - 29;
  const botBayY = height - 19;
  const travel = isClosed ? 6 : 0;

  const manualHold = (e: React.MouseEvent) => {
    if (onPatchState) momentaryPress(e, device.id, 'manualOverride', onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, manualOverride: !device.state.manualOverride } });
    }
  };

  const toggleCutaway = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, { cutaway: !isCutaway });
    else onToggleState?.({ ...device, state: { ...device.state, cutaway: !isCutaway } });
  };

  const topLabels: Array<{ relX: number; text: string; color?: string }> = [
    { relX: 0.08, text: 'A1', color: 'var(--port-control)' },
    { relX: 0.25, text: '1/L1' },
    { relX: 0.41, text: '3/L2' },
    { relX: 0.57, text: '5/L3' },
    { relX: 0.78, text: '13NO', color: 'var(--lamp-green-off)' },
    { relX: 0.93, text: '21NC', color: 'var(--mat-copper)' },
  ];

  const botLabels: Array<{ relX: number; text: string; color?: string }> = [
    { relX: 0.08, text: 'A2', color: 'var(--port-control)' },
    { relX: 0.25, text: '2/T1' },
    { relX: 0.41, text: '4/T2' },
    { relX: 0.57, text: '6/T3' },
    { relX: 0.78, text: '14NO', color: 'var(--lamp-green-off)' },
    { relX: 0.93, text: '22NC', color: 'var(--mat-copper)' },
  ];

  return (
    <g className="select-none">
      <defs>
        <clipPath id={`km-clip-${uid}`}>
          <rect x={x + 2} y={y + bandY + bandH} width={mainW - 4} height={botLabelY - (bandY + bandH) - 1} rx={2} />
        </clipPath>
      </defs>

      {/* Subtle architectural CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="transparent" />

      {/* Main Contactor Housing */}
      <rect x={x} y={y} width={mainW} height={height} rx={4} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Right Integrated Aux Module (LADN11 1NO+1NC) */}
      <rect x={auxX} y={y + 1} width={auxW} height={height - 2} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.2} />

      {/* Top Terminal Pocket Bay */}
      <rect x={x + 1.5} y={y + 1.5} width={mainW - 3} height={topBayH - 1.5} rx={2} fill="var(--mat-housing-dark)" />
      <rect x={auxX + 1.5} y={y + 1.5} width={auxW - 3} height={topBayH - 1.5} rx={2} fill="var(--mat-housing-dark)" />
      {[0.165, 0.33, 0.49].map((r) => (
        <line key={r} x1={x + width * r} y1={y + 2} x2={x + width * r} y2={y + topBayH} stroke="var(--mat-line-soft)" strokeWidth={0.8} />
      ))}
      <line x1={x + width * 0.855} y1={y + 2} x2={x + width * 0.855} y2={y + topBayH} stroke="var(--mat-line-soft)" strokeWidth={0.8} />

      {/* Top Silkscreen Label Band */}
      <rect x={x + 1.5} y={y + topLabelY} width={mainW - 3} height={9} fill="var(--mat-housing)" />
      <rect x={auxX + 1.5} y={y + topLabelY} width={auxW - 3} height={9} fill="var(--mat-housing)" />
      {topLabels.map((lbl) => (
        <text
          key={`tl-${lbl.text}`}
          x={x + width * lbl.relX}
          y={y + topLabelY + 6.6}
          textAnchor="middle"
          fontSize="4.6"
          fontWeight="900"
          fontFamily="var(--font-mono)"
          fill={lbl.color || 'var(--silk)'}
        >
          {lbl.text}
        </text>
      ))}

      {/* Dark Horizontal EduVolt / VoltLab Nameplate Bar */}
      <rect x={x + 1.5} y={y + bandY} width={mainW - 3} height={bandH} fill="var(--nameplate)" />
      <text x={x + 5} y={y + bandY + 8.7} fontSize="5.4" fontWeight="900" fontFamily="var(--font-display)" fill="var(--silk-on-dark)">
        VoltLab
      </text>
      <text x={x + mainW * 0.56} y={y + bandY + 8.7} textAnchor="middle" fontSize="5.3" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--nameplate-tag)">
        {device.state.tag || 'KM1'}
      </text>
      <rect x={x + mainW - 21} y={y + bandY + 2.5} width={17} height={8} rx={1.5} fill={isClosed ? 'var(--cond-green)' : 'var(--mat-housing-dark-face)'} />
      <text x={x + mainW - 12.5} y={y + bandY + 8.2} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        {coilOn ? 'COIL' : isClosed ? 'TEST' : 'OFF'}
      </text>

      <rect x={auxX + 1.5} y={y + bandY} width={auxW - 3} height={bandH} fill="var(--mat-housing-dark-face)" />
      <text x={auxX + auxW / 2} y={y + bandY + 8.4} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        LADN11
      </text>

      {/* Center Faceplate: Normal Front View vs. X-Ray Cutaway */}
      {!isCutaway ? (
        <g>
          {/* Left silkscreen specs (well separated from plunger window) */}
          <text x={x + 5} y={y + 56} fontSize="5.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
            1211
          </text>
          <text x={x + 5} y={y + 64} fontSize="4.2" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            A1-A2
          </text>
          <text x={x + 5} y={y + 71} fontSize="4.2" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            AC-3
          </text>

          {/* Coil state dot below silkscreen */}
          <circle cx={x + 11} cy={y + 84} r={3} fill={coilOn ? 'var(--lamp-green-on)' : 'var(--mat-steel)'} stroke="var(--mat-line)" strokeWidth={0.7} />
          <text x={x + 16} y={y + 85.5} fontSize="3.8" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk)">
            {coilOn ? 'MAG' : 'IDLE'}
          </text>

          {/* EduVolt 3-Window Rectangular Center Plunger */}
          <g onMouseDown={manualHold} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
            <title>Hold to manually depress armature & close 3P main + aux contacts (Shift/Click in Sim)</title>
            <rect
              x={x + mainW * 0.34}
              y={y + 55}
              width={mainW * 0.60}
              height={24}
              rx={2}
              fill="var(--mat-housing-shade)"
              stroke="var(--mat-line)"
              strokeWidth={0.9}
            />
            {[0, 1, 2].map((i) => {
              const wx = x + mainW * 0.37 + i * (mainW * 0.19);
              const ww = mainW * 0.16;
              return (
                <g key={`plw-${i}`} transform={isClosed ? 'translate(0, 2)' : undefined}>
                  <rect
                    x={wx}
                    y={y + 58}
                    width={ww}
                    height={16}
                    rx={1}
                    fill={isClosed ? '#dcfce7' : 'var(--mat-housing)'}
                    stroke={isClosed ? 'var(--cond-green)' : 'var(--silk-muted)'}
                    strokeWidth={0.9}
                  />
                  <rect
                    x={wx + 2}
                    y={isClosed ? y + 65 : y + 60}
                    width={ww - 4}
                    height={4.5}
                    rx={0.5}
                    fill={isClosed ? 'var(--cond-green)' : 'var(--mat-steel)'}
                  />
                </g>
              );
            })}
          </g>

          <text
            x={x + mainW * 0.64}
            y={y + 92}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="800"
            fontFamily="var(--font-mono)"
            fill={isClosed ? 'var(--cond-green)' : 'var(--silk-muted)'}
          >
            {isClosed ? 'CLOSED · PULLED IN' : 'OPEN · HOLD TEST'}
          </text>
          <text
            x={x + mainW / 2}
            y={y + 104}
            textAnchor="middle"
            fontSize="4.1"
            fontWeight="700"
            fontFamily="var(--font-mono)"
            fill="var(--silk-muted)"
          >
            {device.state.ratedAmps || 25}A · 440V~ IEC 60947
          </text>
        </g>
      ) : (
        /* Internal X-Ray Cutaway View (clipped cleanly inside main faceplate) */
        <g clipPath={`url(#km-clip-${uid})`} onMouseDown={manualHold} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
          <title>X-Ray Cutaway — hold to actuate coil & armature</title>
          <rect x={x + 2} y={y + bandY + bandH} width={mainW - 4} height={botLabelY - (bandY + bandH) - 1} fill="var(--mat-line)" />
          {/* Fixed pole paths & contact pads */}
          {poleXs.map((px, i) => (
            <g key={`xpole-${i}`}>
              <line x1={px} y1={y + bandY + bandH + 2} x2={px - 4} y2={y + 56} stroke="var(--lamp-amber-on)" strokeWidth={1.6} />
              <line x1={px} y1={y + botLabelY - 2} x2={px + 4} y2={y + 56} stroke="var(--lamp-amber-on)" strokeWidth={1.6} />
              <rect x={px - 6.5} y={y + 55} width={4.5} height={2.2} fill="var(--mat-housing-shade)" />
              <rect x={px + 2} y={y + 55} width={4.5} height={2.2} fill="var(--mat-housing-shade)" />
            </g>
          ))}
          {/* Moving Contact Bridge & Armature */}
          <g style={{ transform: `translateY(${travel}px)`, transition: 'transform 110ms ease-out' }}>
            <rect x={x + 12} y={y + 45} width={mainW - 22} height={3} rx={1} fill="var(--mat-housing-shade)" />
            {poleXs.map((px, i) => (
              <rect key={`xbr-${i}`} x={px - 7.5} y={y + 48.2} width={15} height={2.4} rx={0.6} fill="var(--mat-pvc-orange)" />
            ))}
            <rect x={x + mainW / 2 - 1.5} y={y + 48} width={3} height={11} fill="var(--mat-steel)" />
            <rect x={x + 15} y={y + 59} width={mainW - 30} height={6} rx={1} fill="var(--mat-line-soft)" stroke="var(--mat-housing-shade)" strokeWidth={0.5} />
          </g>
          {/* Fixed E-Core & Energizing A1-A2 Coil */}
          <rect x={x + 15} y={y + 73} width={mainW - 30} height={22} rx={1.5} fill="var(--silk-muted)" stroke="var(--mat-steel)" strokeWidth={0.6} />
          <rect
            x={x + 21}
            y={y + 77}
            width={mainW - 42}
            height={14}
            rx={1.5}
            fill={coilOn ? 'var(--mat-pvc-orange)' : 'var(--mat-copper-dark)'}
            stroke={coilOn ? '#fed7aa' : 'var(--mat-copper-dark)'}
            strokeWidth={0.8}
          />
          <text x={x + mainW / 2} y={y + 86} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="#fff7ed">
            COIL A1–A2
          </text>
          <text x={x + mainW / 2} y={y + 104} textAnchor="middle" fontSize="4" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--nameplate-tag)">
            {coilOn ? 'MAGNET PULLED IN' : isClosed ? 'MANUAL PLUNGER' : 'SPRING RELEASED'}
          </text>
        </g>
      )}

      {/* Right Aux Window Indicators (13-14 NO / 21-22 NC) */}
      {[
        { relX: 0.78, label: 'NO', isNc: false, closed: isClosed },
        { relX: 0.925, label: 'NC', isNc: true, closed: !isClosed },
      ].map((win) => {
        const wx = x + width * win.relX;
        const wy = y + 66;
        const col = win.closed ? 'var(--cond-green)' : win.isNc ? 'var(--cond-red)' : 'var(--silk-muted)';
        return (
          <g key={`aux-${win.label}`}>
            <rect x={wx - 6} y={wy - 15} width={12} height={28} rx={1.5} fill="var(--mat-housing)" stroke="var(--silk-muted)" strokeWidth={0.8} />
            <line x1={wx} y1={wy - 12} x2={wx} y2={wy - 4} stroke={col} strokeWidth={1.1} />
            <line x1={wx} y1={wy + 4} x2={wx} y2={wy + 12} stroke={col} strokeWidth={1.1} />
            <line
              x1={wx}
              y1={wy + 4}
              x2={win.closed ? wx : wx + (win.isNc ? 4 : -4)}
              y2={wy - 4}
              stroke={col}
              strokeWidth={1.3}
            />
            {win.isNc && <line x1={wx - 3} y1={wy - 4} x2={wx + 3} y2={wy - 4} stroke={col} strokeWidth={0.9} />}
            <text x={wx} y={wy + 20} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
              {win.label}
            </text>
          </g>
        );
      })}

      {/* Compact X-Ray Toggle cleanly placed above Bottom Silkscreen */}
      <SvgPill
        x={auxX + auxW / 2}
        y={y + 101}
        w={auxW - 6}
        label={isCutaway ? 'FRONT' : 'X-RAY'}
        active={isCutaway}
        title="Toggle internal electromagnet cutaway view"
        onClick={toggleCutaway}
      />
      {/* Suppress unused stopCanvas import warnings if kept, or keep clean */}
      {false && <g onMouseDown={stopCanvas} />}

      {/* Bottom Silkscreen Label Band */}
      <rect x={x + 1.5} y={y + botLabelY} width={mainW - 3} height={9} fill="var(--mat-housing)" />
      <rect x={auxX + 1.5} y={y + botLabelY} width={auxW - 3} height={9} fill="var(--mat-housing)" />
      {botLabels.map((lbl) => (
        <text
          key={`bl-${lbl.text}`}
          x={x + width * lbl.relX}
          y={y + botLabelY + 6.6}
          textAnchor="middle"
          fontSize="4.6"
          fontWeight="900"
          fontFamily="var(--font-mono)"
          fill={lbl.color || 'var(--silk)'}
        >
          {lbl.text}
        </text>
      ))}

      {/* Bottom Terminal Pocket Bay */}
      <rect x={x + 1.5} y={y + botBayY} width={mainW - 3} height={17.5} rx={2} fill="var(--mat-housing-dark)" />
      <rect x={auxX + 1.5} y={y + botBayY} width={auxW - 3} height={17.5} rx={2} fill="var(--mat-housing-dark)" />
      {[0.165, 0.33, 0.49].map((r) => (
        <line key={`bd-${r}`} x1={x + width * r} y1={y + botBayY} x2={x + width * r} y2={y + height - 2} stroke="var(--mat-line-soft)" strokeWidth={0.8} />
      ))}
      <line x1={x + width * 0.855} y1={y + botBayY} x2={x + width * 0.855} y2={y + height - 2} stroke="var(--mat-line-soft)" strokeWidth={0.8} />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
