import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { DeviceIdContext } from './TerminalContext';
import { KwhMeterDevice } from './KwhMeterDevice';
import { McbDevice } from './McbDevice';
import { RcdDevice } from './RcdDevice';
import { SpdDevice } from './SpdDevice';
import { BusbarDevice } from './BusbarDevice';
import { EarthPitDevice } from './EarthPitDevice';
import { WallSwitchDevice } from './WallSwitchDevice';
import { SocketDevice } from './SocketDevice';
import { LightFixtureDevice } from './LightFixtureDevice';
import { ApplianceDevice } from './ApplianceDevice';
import { MotorStarterDevice } from './MotorStarterDevice';
import { JunctionBoxDevice } from './JunctionBoxDevice';
import { SpliceNutDevice } from './SpliceNutDevice';
import { IndustrialRelayDevice } from './IndustrialRelayDevice';
import { ContactorDevice } from './ContactorDevice';
import { PushButtonStationDevice } from './PushButtonStationDevice';
import { EstopDevice } from './EstopDevice';
import { PilotLightDevice } from './PilotLightDevice';
import { PlcDevice } from './PlcDevice';
import { IndustrialMotorDevice } from './IndustrialMotorDevice';
import { RoyuSafetyBreakerDevice } from './RoyuSafetyBreakerDevice';
import { DinRailTrackDevice } from './DinRailTrackDevice';
import { UtilityBoxSurfacePvcDevice } from './UtilityBoxSurfacePvcDevice';
import { RoyuModularComboPlateDevice } from './RoyuModularComboPlateDevice';
import { ThermalOverloadDevice } from './ThermalOverloadDevice';
import { ControlTransformerDevice } from './ControlTransformerDevice';
import { ThreePhaseSourceDevice } from './ThreePhaseSourceDevice';
import { PushButtonFwdRevDevice } from './PushButtonFwdRevDevice';
import { SwitchMultiGangDevice } from './SwitchMultiGangDevice';
import { PanelHardwareDevice } from './PanelHardwareDevice';
import { IndustrialControlExtDevice } from './IndustrialControlExtDevice';

interface DeviceRendererProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  /** Part of a Shift+click multi-selection (outline only, no floating action bar) */
  isGroupMember?: boolean;
  /** Glow highlight (linked from the ladder diagram) */
  isHighlighted?: boolean;
  /** True while the grid is energized or the device position is locked */
  dragLocked?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onDeviceMouseDown: (device: ElectricalDevice, e: React.MouseEvent) => void;
  /** Double-click on the device body (not a terminal) — opens the inspector */
  onDeviceDoubleClick?: (device: ElectricalDevice, e: React.MouseEvent) => void;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
  onPatchState?: (deviceId: string, patch: Record<string, any>) => void;
  onRotate?: (device: ElectricalDevice) => void;
  onDuplicate?: (device: ElectricalDevice) => void;
  onDelete?: (device: ElectricalDevice) => void;
}

export const DeviceRenderer: React.FC<DeviceRendererProps> = ({
  device,
  isSelected,
  isGroupMember,
  isHighlighted,
  dragLocked,
  selectedTerminalId,
  hoveredTerminalId,
  onDeviceMouseDown,
  onDeviceDoubleClick,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
  onPatchState,
  onRotate,
  onDuplicate,
  onDelete,
}) => {
  const commonProps = {
    device,
    selectedTerminalId,
    hoveredTerminalId,
    onTerminalMouseDown,
    setHoveredTerminalId,
    onToggleState,
    onPatchState,
  };

  const cx = device.x + device.width / 2;
  const cy = device.y + device.height / 2;
  const rot = device.rotation || 0;
  const isRotated90or270 = rot === 90 || rot === 270;
  const apparentHalfH = isRotated90or270 ? device.width / 2 : device.height / 2;
  const floatingBarY = cy - apparentHalfH - 22;

  const renderComponent = () => {
    switch (device.type) {
      case 'kwh_meter_1p':
      case 'kwh_meter_3p':
        return <KwhMeterDevice {...commonProps} />;
      case 'service_disconnect_2p':
      case 'mcb_1p':
      case 'mcb_2p':
      case 'mcb_3p':
        return <McbDevice {...commonProps} />;
      case 'rcd_2p':
        return <RcdDevice {...commonProps} />;
      case 'spd_surge':
        return <SpdDevice {...commonProps} />;
      case 'earth_busbar':
      case 'neutral_busbar':
        return <BusbarDevice {...commonProps} />;
      case 'ground_pit':
        return <EarthPitDevice {...commonProps} />;
      case 'switch_1gang':
      case 'switch_3way':
      case 'switch_4way':
        return <WallSwitchDevice {...commonProps} />;
      case 'socket_duplex':
      case 'socket_schuko':
        return <SocketDevice {...commonProps} />;
      case 'light_bulb':
        return <LightFixtureDevice {...commonProps} />;
      case 'appliance_tv':
      case 'appliance_water_heater':
      case 'appliance_fan':
      case 'appliance_ac':
        return <ApplianceDevice {...commonProps} />;
      case 'motor_3phase_dol':
        return <MotorStarterDevice {...commonProps} />;
      case 'junction_box':
      case 'junction_box_4way':
      case 'junction_box_octagonal_orange':
        return <JunctionBoxDevice {...commonProps} />;
      case 'splice_wire_nut':
      case 'wago_connector_3p':
        return <SpliceNutDevice {...commonProps} />;
      case 'industrial_relay_dpdt':
        return <IndustrialRelayDevice {...commonProps} />;
      case 'contactor_3p':
        return <ContactorDevice {...commonProps} />;
      case 'push_button_station':
        return <PushButtonStationDevice {...commonProps} />;
      case 'push_button_estop':
        return <EstopDevice {...commonProps} />;
      case 'pilot_light_indicator':
        return <PilotLightDevice {...commonProps} />;
      case 'plc_micro_controller':
        return <PlcDevice {...commonProps} />;
      case 'motor_ac_industrial':
      case 'motor_6lead_star_delta':
        return <IndustrialMotorDevice {...commonProps} />;
      case 'royu_safety_breaker_2p':
        return <RoyuSafetyBreakerDevice {...commonProps} />;
      case 'din_rail_track':
        return <DinRailTrackDevice {...commonProps} />;
      case 'utility_box_surface_pvc':
        return <UtilityBoxSurfacePvcDevice {...commonProps} />;
      case 'royu_modular_combo_plate':
        return <RoyuModularComboPlateDevice {...commonProps} />;
      case 'thermal_overload_relay':
        return <ThermalOverloadDevice {...commonProps} />;
      case 'control_transformer':
        return <ControlTransformerDevice {...commonProps} />;
      case 'source_3phase_440v':
        return <ThreePhaseSourceDevice {...commonProps} />;
      case 'push_button_fwd_rev':
        return <PushButtonFwdRevDevice {...commonProps} />;
      case 'switch_2gang':
      case 'switch_3gang':
      case 'dimmer_switch':
        return <SwitchMultiGangDevice {...commonProps} />;
      case 'ats_changeover':
      case 'panelboard_frame':
      case 'panel_meter':
        return <PanelHardwareDevice {...commonProps} />;
      case 'timer_relay':
      case 'selector_hoa':
      case 'limit_switch':
      case 'vfd_drive':
        return <IndustrialControlExtDevice {...commonProps} />;
      default:
        return <McbDevice {...commonProps} />;
    }
  };

  return (
    <g
      onMouseDown={(e) => onDeviceMouseDown(device, e)}
      onDoubleClick={(e) => {
        if ((e.target as Element).closest?.('[data-terminal]')) return;
        onDeviceDoubleClick?.(device, e);
      }}
      className={`${dragLocked ? 'cursor-pointer' : 'cursor-move'} group`}
    >
      {/* Rotatable Device Container & Selection Outline */}
      <g transform={rot ? `rotate(${rot}, ${cx}, ${cy})` : undefined}>
        {(isSelected || isGroupMember) && (
          <rect
            x={device.x - 4}
            y={device.y - 4}
            width={device.width + 8}
            height={device.height + 8}
            rx={6}
            fill="none"
            stroke={isSelected ? '#0284c7' : '#7c3aed'}
            strokeWidth={1.8}
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        )}
        {isHighlighted && (
          <rect
            x={device.x - 8}
            y={device.y - 8}
            width={device.width + 16}
            height={device.height + 16}
            rx={10}
            fill="rgba(250,204,21,0.10)"
            stroke="#f59e0b"
            strokeWidth={2.4}
            className="pointer-events-none animate-pulse"
          />
        )}
        <DeviceIdContext.Provider value={device.id}>
          {renderComponent()}
        </DeviceIdContext.Provider>

        {/* Position-lock padlock badge */}
        {device.state.locked && (
          <g
            transform={`translate(${device.x + device.width + 2}, ${device.y - 2})`}
            className="pointer-events-none"
          >
            <circle r={8} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.2} />
            <rect x={-3} y={-1} width={6} height={5} rx={1} fill="#ffffff" />
            <path d="M -2 -1 L -2 -3 A 2 2 0 0 1 2 -3 L 2 -1" fill="none" stroke="#ffffff" strokeWidth={1.1} />
          </g>
        )}
      </g>

      {/* Floating Action Bar on Selected Device (Rotate, Duplicate, Delete) */}
      {isSelected && (
        <g
          transform={`translate(${cx}, ${floatingBarY})`}
          className="select-none"
        >
          {/* Pill Container */}
          <rect
            x={-54}
            y={-14}
            width={108}
            height={28}
            rx={14}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth={1.2}
            filter="drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
          />

          {/* Rotate Button */}
          <g
            transform="translate(-34, 0)"
            className="cursor-pointer hover:opacity-75 transition-opacity"
            onMouseDown={(e) => {
              e.stopPropagation();
              onRotate && onRotate(device);
            }}
          >
            <circle r={11} fill="#f1f5f9" />
            {/* Rotate 90 Arrow Icon */}
            <path
              d="M -4 -2 A 5 5 0 1 1 -2 4 M -5 -5 L -4 -2 L -1 -3"
              fill="none"
              stroke="#0f172a"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Duplicate Button */}
          <g
            transform="translate(0, 0)"
            className="cursor-pointer hover:opacity-75 transition-opacity"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDuplicate && onDuplicate(device);
            }}
          >
            <circle r={11} fill="#f1f5f9" />
            {/* Copy / Duplicate Icon */}
            <rect x={-4} y={-4} width={7} height={7} rx={1} fill="none" stroke="#0f172a" strokeWidth={1.1} />
            <path d="M -1 -1 L 4 -1 L 4 4" fill="none" stroke="#0f172a" strokeWidth={1.1} />
          </g>

          {/* Delete Button */}
          <g
            transform="translate(34, 0)"
            className="cursor-pointer hover:opacity-75 transition-opacity"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDelete && onDelete(device);
            }}
          >
            <circle r={11} fill="#fef2f2" />
            {/* Trash Icon */}
            <path
              d="M -4 -3 L 4 -3 M -3 -3 L -3 4 L 3 4 L 3 -3 M -1 -5 L 1 -5"
              fill="none"
              stroke="#ef4444"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          </g>
        </g>
      )}
    </g>
  );
};
