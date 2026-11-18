import type { DeviceType } from '../types/electrical';

/**
 * Inspector controls for the generic device modules (batches 3.3 onward), described as data so that one
 * component (ModuleInspector) can render them. Each entry lists the adjustable properties of a device type.
 */
export type ModuleControl =
  | { kind: 'number'; key: string; label: string; min: number; max: number; step: number; unit: string; def: number; fmt?: 'clock' }
  | { kind: 'select'; key: string; label: string; options: { v: string | number; label: string }[]; def: string | number }
  | { kind: 'device'; key: string; label: string; types: DeviceType[] }
  | { kind: 'toggle'; key: string; label: string; def?: boolean }
  | { kind: 'action'; label: string; patch: Record<string, unknown> };

export interface ModuleSpec {
  title: string;
  controls: ModuleControl[];
  hint?: string;
}

export const MODULE_SPECS: Partial<Record<DeviceType, ModuleSpec>> = {
  star_delta_timer: {
    title: 'Star-delta timer',
    controls: [
      { kind: 'number', key: 'starSec', label: 'Star time', min: 1, max: 30, step: 1, unit: 's', def: 5 },
      { kind: 'number', key: 'pauseMs', label: 'Transition pause', min: 50, max: 200, step: 50, unit: 'ms', def: 100 },
    ],
    hint: 'Wire 13-14 to the star contactor coil and 23-24 to the delta contactor coil. The pause is modelled as one 0.5 s simulation step.',
  },
  counter_relay: {
    title: 'Counter relay',
    controls: [
      { kind: 'number', key: 'preset', label: 'Preset count', min: 1, max: 20, step: 1, unit: '', def: 5 },
      { kind: 'action', label: 'Clear the count', patch: { count: 0, out: false } },
    ],
    hint: 'Pulses on C1-C2 are counted on the rising edge; the output latches at the preset until R1-R2 is energized. A pulse must last one 0.5 s step.',
  },
  impulse_relay: {
    title: 'Impulse relay',
    controls: [{ kind: 'toggle', key: 'latched', label: 'Contacts latched (on)' }],
    hint: 'Each pulse on the coil toggles the contacts. Wire several push buttons in parallel for multi-point lighting control.',
  },
  staircase_timer: {
    title: 'Staircase timer',
    controls: [{ kind: 'number', key: 'timeSec', label: 'Run time', min: 5, max: 120, step: 5, unit: 's', def: 30 }],
    hint: 'Push buttons go from L to PB. Holding or pressing again restarts the run time; OUT feeds the light.',
  },
  time_switch_24h: {
    title: '24-hour time switch',
    controls: [
      { kind: 'number', key: 'onMin', label: 'Switch on at', min: 0, max: 1425, step: 15, unit: '', def: 360, fmt: 'clock' },
      { kind: 'number', key: 'offMin', label: 'Switch off at', min: 0, max: 1425, step: 15, unit: '', def: 1080, fmt: 'clock' },
      { kind: 'number', key: 'clockMin', label: 'Clock', min: 0, max: 1425, step: 15, unit: '', def: 480, fmt: 'clock' },
      { kind: 'select', key: 'speed', label: 'Clock speed', def: 60, options: [{ v: 1, label: 'x1 (real time)' }, { v: 60, label: 'x60' }, { v: 600, label: 'x600' }, { v: 3600, label: 'x3600 (a day in 24 s)' }] },
      { kind: 'select', key: 'mode', label: 'Mode', def: 'auto', options: [{ v: 'auto', label: 'Auto (schedule)' }, { v: 'on', label: 'Manual on' }, { v: 'off', label: 'Manual off' }] },
    ],
    hint: 'The clock only runs while the switch is powered. Wiring L to COM and the load to NO switches it on the schedule.',
  },
  alternating_relay: {
    title: 'Alternating relay',
    controls: [{ kind: 'select', key: 'lead', label: 'Next lead pump', def: 2, options: [{ v: 1, label: 'Pump 1 (13-14)' }, { v: 2, label: 'Pump 2 (23-24)' }] }],
    hint: 'The lead flips every time the coil energizes. The setting shows the pump that ran last; the next start uses the other.',
  },
  ssr_1p: {
    title: 'Solid-state relay',
    controls: [{ kind: 'number', key: 'leakageMa', label: 'Off-state leakage (note)', min: 1, max: 10, step: 1, unit: 'mA', def: 5 }],
    hint: 'The input accepts 24 V DC or AC. The leakage is shown for teaching: the solver treats the off output as open.',
  },
  operator_pilot: {
    title: 'Control operator',
    controls: [
      {
        kind: 'select', key: 'operatorKind', label: 'Operator', def: 'illuminated_pb',
        options: [
          { v: 'illuminated_pb', label: 'Illuminated push button' },
          { v: 'key_selector', label: 'Key selector' },
          { v: 'selector_2pos', label: '2-position selector' },
          { v: 'foot_switch', label: 'Foot switch (guarded)' },
          { v: 'pendant_station', label: 'Pendant station (up / down)' },
        ],
      },
    ],
    hint: 'The lamp (X1-X2) is separate from the contacts: wire it to the coil it should show.',
  },
  aux_contact_block: {
    title: 'Auxiliary contact block',
    controls: [{ kind: 'device', key: 'parentId', label: 'Parent contactor', types: ['contactor_3p'] }],
    hint: 'Its contacts follow the parent contactor one simulation step after the coil.',
  },
  mechanical_interlock: {
    title: 'Mechanical interlock',
    controls: [
      { kind: 'device', key: 'a', label: 'Contactor A', types: ['contactor_3p'] },
      { kind: 'device', key: 'b', label: 'Contactor B', types: ['contactor_3p'] },
    ],
    hint: 'Once one contactor is pulled in the other cannot close, even with both coils powered.',
  },
  safety_relay: {
    title: 'Safety relay',
    controls: [{ kind: 'select', key: 'startMode', label: 'Start', def: 'manual', options: [{ v: 'manual', label: 'Monitored manual start (X1-X2)' }, { v: 'auto', label: 'Automatic start' }] }],
    hint: 'Each channel is wired from S11 / S21 through its contacts back to S12 / S22. Wire a start button between X1 and X2 for a manual start.',
  },
  two_hand_station: {
    title: 'Two-hand station',
    controls: [],
    hint: 'Hold both palm buttons on the device within 0.5 s of each other. Releasing either one opens 13-14 again.',
  },
  door_interlock_switch: {
    title: 'Door interlock switch',
    controls: [{ kind: 'toggle', key: 'doorClosed', label: 'Door closed', def: true }],
  },
  pull_cord_switch: {
    title: 'Pull-cord switch',
    controls: [{ kind: 'toggle', key: 'pulled', label: 'Cord pulled (latched)' }],
  },

  // Batch 3.4: sensors and field devices
  electrode_level_relay: {
    title: 'Electrode level relay',
    controls: [
      { kind: 'select', key: 'mode', label: 'Mode', def: 'fill', options: [{ v: 'fill', label: 'Fill (start below min, stop at max)' }, { v: 'drain', label: 'Drain (start at max, stop below min)' }] },
      { kind: 'number', key: 'minPct', label: 'Min probe', min: 5, max: 60, step: 5, unit: '%', def: 30 },
      { kind: 'number', key: 'maxPct', label: 'Max probe', min: 40, max: 95, step: 5, unit: '%', def: 70 },
    ],
    hint: 'The probes follow the shared tank level (set it, or let a pump change it, in the pump and float switch inspector).',
  },
  thermostat: {
    title: 'Thermostat',
    controls: [
      { kind: 'select', key: 'mode', label: 'Action', def: 'heat', options: [{ v: 'heat', label: 'Heating (NO closes when cold)' }, { v: 'cool', label: 'Cooling (NO closes when hot)' }] },
      { kind: 'number', key: 'setpointC', label: 'Setpoint', min: 5, max: 60, step: 1, unit: 'C', def: 22 },
      { kind: 'number', key: 'hystC', label: 'Hysteresis band', min: 1, max: 10, step: 1, unit: 'C', def: 2 },
      { kind: 'number', key: 'ambientC', label: 'Ambient', min: -10, max: 40, step: 1, unit: 'C', def: 10 },
      { kind: 'number', key: 'tempC', label: 'Sensed temperature', min: -10, max: 80, step: 1, unit: 'C', def: 15 },
      { kind: 'device', key: 'heaterId', label: 'Heater it controls', types: ['appliance_water_heater', 'light_bulb'] },
    ],
    hint: 'The temperature moves towards the ambient and rises while the heater is energized.',
  },
  thermocouple_k: {
    title: 'Thermocouple',
    controls: [
      { kind: 'number', key: 'tempC', label: 'Junction temperature', min: 0, max: 600, step: 5, unit: 'C', def: 20 },
      { kind: 'number', key: 'ambientC', label: 'Ambient', min: 0, max: 40, step: 1, unit: 'C', def: 20 },
      { kind: 'device', key: 'heaterId', label: 'Heater that warms it', types: ['appliance_water_heater', 'light_bulb'] },
    ],
    hint: 'Wire + and - to TC+ and TC- of the temperature controller: both legs must go to the same probe.',
  },
  temp_controller: {
    title: 'Temperature controller',
    controls: [
      { kind: 'select', key: 'mode', label: 'Action', def: 'heat', options: [{ v: 'heat', label: 'Heating' }, { v: 'cool', label: 'Cooling' }] },
      { kind: 'number', key: 'setpointC', label: 'Setpoint', min: 20, max: 400, step: 5, unit: 'C', def: 80 },
      { kind: 'number', key: 'hystC', label: 'Hysteresis band', min: 1, max: 20, step: 1, unit: 'C', def: 4 },
    ],
  },
  reed_switch: {
    title: 'Reed switch',
    controls: [
      { kind: 'number', key: 'position', label: 'Magnet position', min: 0, max: 100, step: 1, unit: '%', def: 0 },
      { kind: 'number', key: 'windowLo', label: 'Operates from', min: 0, max: 100, step: 5, unit: '%', def: 40 },
      { kind: 'number', key: 'windowHi', label: 'Operates to', min: 0, max: 100, step: 5, unit: '%', def: 60 },
    ],
  },
  photocell_switch: {
    title: 'Photocell',
    controls: [
      { kind: 'number', key: 'lux', label: 'Light level', min: 0, max: 1000, step: 10, unit: 'lux', def: 500 },
      { kind: 'number', key: 'thresholdLux', label: 'Switch-on level', min: 5, max: 200, step: 5, unit: 'lux', def: 50 },
    ],
    hint: 'Switches off again above 1.5 times the threshold.',
  },
  pir_sensor: {
    title: 'PIR sensor',
    controls: [
      { kind: 'toggle', key: 'motion', label: 'Movement detected' },
      { kind: 'number', key: 'holdSec', label: 'Hold time', min: 5, max: 120, step: 5, unit: 's', def: 30 },
      { kind: 'toggle', key: 'daylightLock', label: 'Daylight lock' },
      { kind: 'number', key: 'lux', label: 'Light level', min: 0, max: 1000, step: 10, unit: 'lux', def: 0 },
    ],
  },
  flow_switch: {
    title: 'Flow switch',
    controls: [{ kind: 'number', key: 'thresholdLpm', label: 'Set flow', min: 1, max: 30, step: 1, unit: 'L/min', def: 5 }],
    hint: 'Flow is the draw-off slider of the shared process while the line holds pressure.',
  },
  zero_speed_switch: {
    title: 'Zero-speed switch',
    controls: [
      { kind: 'device', key: 'motorId', label: 'Motor', types: ['motor_ac_industrial', 'pump_booster_3p', 'motor_6lead_star_delta', 'motor_1p'] },
      { kind: 'number', key: 'setPct', label: 'Standstill below', min: 1, max: 20, step: 1, unit: '%', def: 5 },
      { kind: 'number', key: 'coastSec', label: 'Coast-down time', min: 1, max: 20, step: 1, unit: 's', def: 6 },
    ],
  },
  solenoid_valve: {
    title: 'Solenoid valve',
    controls: [{ kind: 'toggle', key: 'manual', label: 'Manual override' }],
  },
  smoke_detector: {
    title: 'Smoke detector',
    controls: [{ kind: 'toggle', key: 'smoke', label: 'Smoke present' }],
  },
  manual_call_point: {
    title: 'Manual call point',
    controls: [{ kind: 'toggle', key: 'pulled', label: 'Operated (latched)' }],
  },
  fire_alarm_panel: {
    title: 'Fire alarm panel',
    controls: [
      { kind: 'toggle', key: 'silenced', label: 'Bell silenced' },
      { kind: 'action', label: 'Reset the panel', patch: { resetRequested: true } },
    ],
    hint: 'Feed the loop from LOOP+, put detectors and call points in parallel and bring the return to LOOP-.',
  },
};
