import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { DeviceIdContext } from './TerminalContext';
import { KwhMeterDevice } from './KwhMeterDevice';
import { McbDevice } from './McbDevice';
import { FuseDevice } from './FuseDevice';
import { GeneratorDevice } from './GeneratorDevice';
import { LevelSwitchDevice, PumpDevice } from './ProcessDevices';
import { PhaseMonitorDevice } from './PhaseMonitorDevice';
import { PowerSystemsDevice } from './PowerSystemsDevice';
import { ControlModuleDevice } from './ControlModuleDevice';
import { FieldModuleDevice } from './FieldModuleDevice';
import { DriveModuleDevice } from './DriveModuleDevice';
import { HomeModuleDevice } from './HomeModuleDevice';
import { BuzzerDevice, BeaconDevice, TowerLightDevice } from './Annunciators';
import { ProtectionModuleDevice, GfciDevice, MonitoringRelayDevice, CtDevice, AmmeterDevice, VoltmeterSelectorDevice, TerminalBlockDevice } from './ProtectionDevices';
import { Motor1pDevice, CapacitorDevice } from './SinglePhaseMotor';
import { PsuDevice, SensorDevice, Plc24Device } from './DcDevices';
import { RcdDevice } from './RcdDevice';
import { SpdDevice } from './SpdDevice';
import { BusbarDevice } from './BusbarDevice';
import { EarthPitDevice } from './EarthPitDevice';
import { WallSwitchDevice } from './WallSwitchDevice';
import { SocketDevice } from './SocketDevice';
import { LightFixtureDevice } from './LightFixtureDevice';
import { ApplianceDevice } from './ApplianceDevice';
import { JunctionBoxDevice } from './JunctionBoxDevice';
import { SpliceNutDevice } from './SpliceNutDevice';
import { IndustrialRelayDevice } from './IndustrialRelayDevice';
import { ContactorDevice } from './ContactorDevice';
import { PushButtonStationDevice } from './PushButtonStationDevice';
import { EstopDevice } from './EstopDevice';
import { PilotLightDevice } from './PilotLightDevice';
import { PlcDevice } from './PlcDevice';
import { IndustrialMotorDevice } from './IndustrialMotorDevice';
import { SafetyBreakerDevice } from './SafetyBreakerDevice';
import { DinRailTrackDevice } from './DinRailTrackDevice';
import { UtilityBoxSurfacePvcDevice } from './UtilityBoxSurfacePvcDevice';
import { ModularComboPlateDevice } from './ModularComboPlateDevice';
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
      case 'buzzer_horn':
        return <BuzzerDevice {...commonProps} />;
      case 'beacon':
        return <BeaconDevice {...commonProps} />;
      case 'tower_light':
        return <TowerLightDevice {...commonProps} />;
      case 'rcd_4p':
      case 'afdd_1pn':
      case 'mccb_3p':
      case 'mpcb_3p':
      case 'rotary_isolator_3p':
        return <ProtectionModuleDevice {...commonProps} />;
      case 'gfci_receptacle':
        return <GfciDevice {...commonProps} />;
      case 'voltage_relay':
      case 'earth_leakage_relay':
      case 'ptc_relay':
        return <MonitoringRelayDevice {...commonProps} />;
      case 'core_balance_ct':
      case 'current_transformer':
        return <CtDevice {...commonProps} />;
      case 'panel_ammeter':
        return <AmmeterDevice {...commonProps} />;
      case 'voltmeter_selector':
        return <VoltmeterSelectorDevice {...commonProps} />;
      case 'terminal_block':
      case 'distribution_block':
        return <TerminalBlockDevice {...commonProps} />;
      case 'motor_1p':
        return <Motor1pDevice {...commonProps} />;
      case 'capacitor_run':
        return <CapacitorDevice {...commonProps} />;
      case 'psu_24vdc':
        return <PsuDevice {...commonProps} />;
      case 'sensor_inductive':
      case 'sensor_capacitive':
      case 'sensor_photoelectric':
        return <SensorDevice {...commonProps} />;
      case 'plc_24vdc_16io':
        return <Plc24Device {...commonProps} />;
      case 'transfer_switch_manual':
      case 'ups_battery':
      case 'pv_string':
      case 'dc_isolator':
      case 'inverter_gridtie':
      case 'net_meter':
      case 'transformer_1p_pole':
      case 'transformer_3p_delta_wye':
      case 'capacitor_bank_3p':
      case 'pf_controller':
      case 'shore_connection_box':
      case 'ground_detection_lamps':
      case 'synchroscope':
      case 'reverse_power_relay':
      case 'preferential_trip_relay':
        return <PowerSystemsDevice {...commonProps} />;
      case 'star_delta_timer':
      case 'counter_relay':
      case 'impulse_relay':
      case 'staircase_timer':
      case 'time_switch_24h':
      case 'alternating_relay':
      case 'ssr_1p':
      case 'operator_pilot':
      case 'aux_contact_block':
      case 'mechanical_interlock':
      case 'safety_relay':
      case 'two_hand_station':
      case 'door_interlock_switch':
      case 'pull_cord_switch':
        return <ControlModuleDevice {...commonProps} />;
      case 'electrode_level_relay':
      case 'thermostat':
      case 'thermocouple_k':
      case 'temp_controller':
      case 'reed_switch':
      case 'photocell_switch':
      case 'pir_sensor':
      case 'flow_switch':
      case 'zero_speed_switch':
      case 'solenoid_valve':
      case 'smoke_detector':
      case 'manual_call_point':
      case 'fire_alarm_panel':
        return <FieldModuleDevice {...commonProps} />;
      case 'soft_starter':
      case 'starter_reduced_voltage':
      case 'motor_dahlander':
      case 'motor_wound_rotor':
      case 'rotor_resistor_bank':
      case 'motor_dc_shunt':
      case 'motor_brake':
      case 'dc_injection_brake':
      case 'speed_potentiometer':
      case 'braking_resistor':
      case 'line_reactor':
      case 'pump_submersible_3p':
      case 'air_compressor_3p':
      case 'hoist_conveyor':
        return <DriveModuleDevice {...commonProps} />;
      case 'appliance_generic':
      case 'emergency_light':
      case 'fan_regulator':
      case 'doorbell_set':
      case 'power_strip':
        return <HomeModuleDevice {...commonProps} />;
      case 'phase_monitor_relay':
        return <PhaseMonitorDevice {...commonProps} />;
      case 'float_switch':
      case 'pressure_switch':
        return <LevelSwitchDevice {...commonProps} />;
      case 'pump_booster_1p':
      case 'pump_booster_3p':
        return <PumpDevice {...commonProps} />;
      case 'generator_set_1p':
      case 'generator_set_3p':
        return <GeneratorDevice {...commonProps} />;
      case 'fuse_holder_1p':
      case 'fuse_switch_disconnector_3p':
        return <FuseDevice {...commonProps} />;
      case 'rcd_2p':
      case 'rcbo_1pn':
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
      case 'junction_box_4way':
      case 'junction_box_octagonal_orange':
        return <JunctionBoxDevice {...commonProps} />;
      case 'splice_wire_nut':
      case 'lever_connector_3p':
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
      case 'safety_breaker_2p':
        return <SafetyBreakerDevice {...commonProps} />;
      case 'din_rail_track':
        return <DinRailTrackDevice {...commonProps} />;
      case 'utility_box_surface_pvc':
        return <UtilityBoxSurfacePvcDevice {...commonProps} />;
      case 'modular_combo_plate':
        return <ModularComboPlateDevice {...commonProps} />;
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
          <g className="pointer-events-none">
            {/* Selected: probe outline 3 units outside the housing, plus corner grips */}
            <rect
              x={device.x - 3}
              y={device.y - 3}
              width={device.width + 6}
              height={device.height + 6}
              rx={5}
              fill="none"
              stroke="var(--probe)"
              strokeWidth={1.5}
              strokeDasharray={isSelected ? undefined : '4 3'}
            />
            {isSelected &&
              [
                [device.x - 3, device.y - 3],
                [device.x + device.width + 3, device.y - 3],
                [device.x - 3, device.y + device.height + 3],
                [device.x + device.width + 3, device.y + device.height + 3],
              ].map(([gx, gy], i) => (
                <rect key={i} x={gx - 3} y={gy - 3} width={6} height={6} rx={1} fill="var(--probe-soft)" stroke="var(--probe)" strokeWidth={1.2} />
              ))}
          </g>
        )}
        {isHighlighted && (
          <rect
            x={device.x - 8}
            y={device.y - 8}
            width={device.width + 16}
            height={device.height + 16}
            rx={10}
            fill="var(--warning-fill)"
            fillOpacity={0.12}
            stroke="var(--warning-fill)"
            strokeWidth={2}
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
            <circle r={8} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} />
            <rect x={-3} y={-1} width={6} height={5} rx={1} fill="var(--ink-muted)" />
            <path d="M -2 -1 L -2 -3 A 2 2 0 0 1 2 -3 L 2 -1" fill="none" stroke="var(--ink-muted)" strokeWidth={1.1} />
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
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth={1}
            filter="drop-shadow(0 4px 10px rgba(16,20,24,0.14))"
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
            <circle r={11} fill="var(--surface)" />
            {/* Rotate 90 Arrow Icon */}
            <path
              d="M -4 -2 A 5 5 0 1 1 -2 4 M -5 -5 L -4 -2 L -1 -3"
              fill="none"
              stroke="var(--ink)"
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
            <circle r={11} fill="var(--surface)" />
            {/* Copy / Duplicate Icon */}
            <rect x={-4} y={-4} width={7} height={7} rx={1} fill="none" stroke="var(--ink)" strokeWidth={1.1} />
            <path d="M -1 -1 L 4 -1 L 4 4" fill="none" stroke="var(--ink)" strokeWidth={1.1} />
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
            <circle r={11} fill="var(--danger-soft)" />
            {/* Trash Icon */}
            <path
              d="M -4 -3 L 4 -3 M -3 -3 L -3 4 L 3 4 L 3 -3 M -1 -5 L 1 -5"
              fill="none"
              stroke="var(--danger)"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          </g>
        </g>
      )}
    </g>
  );
};
