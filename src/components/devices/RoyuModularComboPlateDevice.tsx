import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style ROYU Wide-Series 3-Module Combo Plate (Switch + Pilot/Switch2 + Outlet).
 * Embedded top bar toggle [REAR / FRONT] and clean side terminal pockets so screws never overlap buttons/rockers.
 */
export const RoyuModularComboPlateDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isRearView = device.state.viewMode === 'rear';
  const isSwitch1Closed = device.state.switchClosed !== false && device.state.closed !== false;
  const isSwitch2Closed = !!device.state.switch2Closed;
  const isSlot2Pilot = device.state.comboSlot2 !== 'switch2';
  const isPilotLit = !!device.state.pilotLit;
  const isReceptaclePowered = !!device.state.receptaclePowered;
  const cx = x + width / 2;

  const patch = (p: Record<string, any>) => {
    if (onPatchState) onPatchState(device.id, p);
    else {
      Object.assign(device.state, p);
      onToggleState?.({ ...device, state: { ...device.state, ...p } });
    }
  };

  return (
    <g className="select-none">
      {/* Subtle CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />

      {/* Outer Frame */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={isRearView ? 'var(--mat-housing-dark-face)' : 'var(--mat-housing)'}
        stroke="var(--mat-line)"
        strokeWidth={1.3}
      />

      {/* Embedded Top Branding + Flip Pill (cleanly above sw_in/out at y+20.8) */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={11} rx={2} fill="var(--mat-line)" />
      <text x={x + 7} y={y + 9.4} fontSize="4.6" fontWeight="900" fontFamily="var(--font-display)" fill="var(--act-red)">
        ROYU 3-MOD
      </text>
      <g
        onMouseDown={stopCanvas}
        onClick={(e) => {
          e.stopPropagation();
          patch({ viewMode: isRearView ? 'front' : 'rear' });
        }}
        className="cursor-pointer"
      >
        <title>Flip between Front Combo Plate and Rear Snap-In Strap</title>
        <rect x={x + width - 30} y={y + 3} width={25} height={9} rx={1.5} fill={isRearView ? 'var(--act-blue)' : 'var(--mat-housing-dark-face)'} stroke="var(--lamp-blue-on)" strokeWidth={0.5} />
        <text x={x + width - 17.5} y={y + 9} textAnchor="middle" fontSize="3.8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          {isRearView ? 'FRONT' : 'REAR'}
        </text>
      </g>

      {!isRearView ? (
        <g>
          {/* MODULE 1: Wide Rocker Switch (side screw bays + centered toggle) */}
          <rect x={x + 4} y={y + 15} width={width - 8} height={29} rx={2.5} fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth={0.9} />
          <g
            onMouseDown={stopCanvas}
            onClick={(e) => {
              e.stopPropagation();
              patch({ switchClosed: !isSwitch1Closed, closed: !isSwitch1Closed });
            }}
            className="cursor-pointer"
          >
            <title>Click Switch 1 to toggle lighting control</title>
            <rect x={cx - 11} y={y + 17} width={22} height={25} rx={2} fill={isSwitch1Closed ? 'var(--mat-housing)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.9} />
            <rect x={cx - 7} y={isSwitch1Closed ? y + 20 : y + 36} width={14} height={2.8} rx={1} fill={isSwitch1Closed ? 'var(--cond-green)' : 'var(--mat-line-soft)'} />
            <text x={cx} y={y + 32} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
              {isSwitch1Closed ? 'ON' : 'OFF'}
            </text>
          </g>
          <text x={x + 12} y={y + 37} textAnchor="middle" fontSize="3.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            SW_L
          </text>
          <text x={x + width - 12} y={y + 37} textAnchor="middle" fontSize="3.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            OUT
          </text>

          {/* MODULE 2: Pilot Jewel OR 2nd Rocker Switch */}
          <rect x={x + 4} y={y + 47} width={width - 8} height={31} rx={2.5} fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth={0.9} />
          {isSlot2Pilot ? (
            <g>
              <circle cx={cx} cy={y + 62.5} r={8} fill={isPilotLit ? 'var(--act-red)' : 'var(--lamp-red-off)'} stroke="var(--mat-line)" strokeWidth={1} />
              {isPilotLit && <circle cx={cx} cy={y + 62.5} r={11} fill="rgba(239,68,68,0.28)" />}
              <circle cx={cx - 2} cy={y + 60.5} r={2} fill="rgba(255,255,255,0.6)" />
              <text x={cx} y={y + 75.5} textAnchor="middle" fontSize="3.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
                PILOT NEON
              </text>
            </g>
          ) : (
            <g
              onMouseDown={stopCanvas}
              onClick={(e) => {
                e.stopPropagation();
                patch({ switch2Closed: !isSwitch2Closed });
              }}
              className="cursor-pointer"
            >
              <rect x={cx - 11} y={y + 50} width={22} height={25} rx={2} fill={isSwitch2Closed ? 'var(--mat-housing)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.9} />
              <rect x={cx - 7} y={isSwitch2Closed ? y + 53 : y + 69} width={14} height={2.8} rx={1} fill={isSwitch2Closed ? 'var(--cond-green)' : 'var(--mat-line-soft)'} />
            </g>
          )}
          <text x={x + 12} y={y + 75} textAnchor="middle" fontSize="3.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            PL_L
          </text>
          <text x={x + width - 12} y={y + 75} textAnchor="middle" fontSize="3.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            PL_N
          </text>

          {/* MODULE 3: Universal Convenience Outlet */}
          <rect x={x + 4} y={y + 82} width={width - 8} height={height - 86} rx={2.5} fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth={0.9} />
          <rect x={cx - 14} y={y + 85} width={28} height={23} rx={2} fill="var(--mat-housing)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.9} />
          <rect x={cx - 10} y={y + 90} width={6} height={2.6} rx={0.6} fill="var(--mat-line)" />
          <rect x={cx + 4} y={y + 90} width={6} height={2.6} rx={0.6} fill="var(--mat-line)" />
          <path d={`M ${cx - 2} ${y + 97} L ${cx + 2} ${y + 97} L ${cx + 2} ${y + 101} A 2 2 0 0 1 ${cx - 2} ${y + 101} Z`} fill="var(--cond-green)" />
          <circle cx={cx + 10} cy={y + 88} r={1.8} fill={isReceptaclePowered ? 'var(--lamp-green-on)' : 'var(--mat-housing-shade)'} />
          <text x={x + 12} y={y + 120} textAnchor="middle" fontSize="3.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            REC L
          </text>
          <text x={x + width - 12} y={y + 120} textAnchor="middle" fontSize="3.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            REC N
          </text>
        </g>
      ) : (
        /* Rear Galvanized Steel Strap & Snap-in Polyamide Modules */
        <g>
          <rect x={x + 4} y={y + 15} width={width - 8} height={height - 19} rx={3} fill="var(--nameplate)" stroke="var(--silk-muted)" strokeWidth={1} />
          <rect x={cx - 5} y={y + 16} width={10} height={height - 21} rx={1.5} fill="var(--mat-line-soft)" />
          {[y + 21, y + 62, y + 106].map((my, i) => (
            <rect key={`rcmb-${i}`} x={x + 8} y={my - 9} width={width - 16} height={18} rx={2} fill="var(--mat-housing-dark)" stroke="var(--mat-steel)" strokeWidth={0.7} />
          ))}
          <text x={cx} y={y + height - 24} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
            GALV STRAP LUGS
          </text>
        </g>
      )}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
