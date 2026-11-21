import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, ORANGE, GREEN } from './phase1Labs';

/** Batch 3.4 labs: sensors and field devices on a 230 V single-phase supply. */

const RED = '#dc2626';
const live = (to: string, toT: string) => wr('grid', 'l_out', to, toT, RED);
const neut = (to: string, toT: string) => wr('grid', 'n_out', to, toT, BLUE);

// ── A · Tank level control with an electrode relay ───────────────────────────────────────────
const levelDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Supply 230 V' }),
  dev('electrode_level_relay', 40, 230, 'kl', { name: 'KL1 Electrode Level Relay', state: { minPct: 30, maxPct: 70 } }),
  dev('pump_booster_1p', 260, 250, 'pump', { name: 'P1 Filling Pump 1P' }),
  dev('earth_busbar', 420, 260, 'pe', { name: 'PE Earth Bar', state: { isEarth: true } }),
];
const levelWires: ElectricalWire[] = [
  live('kl', 'a1'), neut('kl', 'a2'),
  live('kl', 'com'), wr('kl', 'no', 'pump', 'line', ORANGE), neut('pump', 'neutral'),
  wr('pe', 'pe_1', 'pump', 'ground', GREEN),
];

// ── B · Thermostat and temperature controller ────────────────────────────────────────────────
const thermalDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Supply 230 V' }),
  dev('thermostat', 40, 220, 'st', { name: 'ST1 Room Thermostat', state: { setpointC: 22, hystC: 2, ambientC: 8, tempC: 12, heaterId: 'wh1', heatRate: 0.5 } }),
  dev('appliance_water_heater', 40, 420, 'wh1', { name: 'Room Heater 1.5 kW', state: { wattage: 1500 } }),
  dev('temp_controller', 280, 220, 'tic', { name: 'TIC1 Oven Temperature Controller', state: { setpointC: 60, hystC: 6 } }),
  dev('thermocouple_k', 520, 220, 'tc', { name: 'B1 Oven Thermocouple (type K)', state: { tempC: 20, ambientC: 20, heaterId: 'wh2', heatRate: 1 } }),
  dev('appliance_water_heater', 300, 440, 'wh2', { name: 'Oven Heater 1 kW', state: { wattage: 1000 } }),
];
const thermalWires: ElectricalWire[] = [
  live('st', 'com'), wr('st', 'no', 'wh1', 'line', ORANGE), neut('wh1', 'neutral'),
  live('tic', 'l'), neut('tic', 'n'),
  wr('tic', 'tc_pos', 'tc', 'tc_pos', ORANGE), wr('tic', 'tc_neg', 'tc', 'tc_neg', BLUE),
  live('tic', 'com'), wr('tic', 'no', 'wh2', 'line', ORANGE), neut('wh2', 'neutral'),
];

// ── C · Fire alarm loop and security lighting ────────────────────────────────────────────────
const fireDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Supply 230 V' }),
  dev('fire_alarm_panel', 40, 220, 'fa', { name: 'FA1 Fire Alarm Panel' }),
  dev('smoke_detector', 300, 190, 'sd1', { name: 'SD1 Smoke Detector (Store)', state: { tag: 'SD1' } }),
  dev('smoke_detector', 420, 190, 'sd2', { name: 'SD2 Smoke Detector (Office)', state: { tag: 'SD2' } }),
  dev('manual_call_point', 540, 190, 'mcp', { name: 'MCP1 Manual Call Point' }),
  dev('buzzer_horn', 100, 460, 'bell', { name: 'HA1 Alarm Bell', state: { supply: 'ac230' } }),
  dev('photocell_switch', 360, 360, 'bp', { name: 'BP1 Photocell', state: { lux: 500, thresholdLux: 50 } }),
  dev('pir_sensor', 500, 360, 'bm', { name: 'BM1 PIR Sensor', state: { holdSec: 20 } }),
  dev('light_bulb', 440, 560, 'yard', { name: 'Yard Light' }),
];
const fireWires: ElectricalWire[] = [
  live('fa', 'l'), neut('fa', 'n'),
  ...['sd1', 'sd2', 'mcp'].flatMap((id) => [wr('fa', 'loop_out', id, 'a', ORANGE), wr(id, 'b', 'fa', 'loop_in', ORANGE)]),
  wr('fa', 'bell', 'bell', 'a1', ORANGE), neut('bell', 'a2'),
  live('bp', 'l'), neut('bp', 'n'), wr('bp', 'out', 'bm', 'l', ORANGE), neut('bm', 'n'),
  wr('bm', 'out', 'yard', 'hot', ORANGE), neut('yard', 'neutral'),
];

export const BATCH34_LABS: LabLesson[] = [
  {
    id: 'lab-fld-electrode-level',
    title: 'Tank Level Control with an Electrode Level Relay',
    subtitle: 'Probes at the min and max levels start and stop a filling pump',
    category: 'automation',
    badge: '💧 Level Relay',
    difficulty: 'Intermediate',
    description:
      'An electrode level relay watches the shared tank. When the level falls below the min probe its changeover contact starts the filling pump; the pump runs until the water reaches the max probe. Between the probes the relay keeps its last state (hysteresis), so the pump does not hunt.',
    objectives: [
      'Press ▶ Simulate with the tank at 50 %: the pump is off because the relay has not yet seen the level fall below the min probe.',
      'Use the draw-off slider in the pump inspector to empty the tank below 30 %: the relay calls the pump and the level climbs.',
      'Watch the level stop at the max probe (70 %). Why does the pump not restart straight away when the level drops a little?',
      'Switch the relay to Drain mode and describe what changes.',
    ],
    project: labProject('proj_fld_electrode_level', 'Tank Level Control', 'Electrode level relay with a filling pump.', levelDevices, levelWires),
  },
  {
    id: 'lab-fld-thermal-control',
    title: 'Thermostat and Thermocouple Temperature Control',
    subtitle: 'A room thermostat and an oven temperature controller each hold their setpoint',
    category: 'automation',
    badge: '🌡 Temperature',
    difficulty: 'Intermediate',
    description:
      'Two heating loops. The room thermostat switches a 1.5 kW heater with a 2 °C band. The oven controller reads a type K thermocouple on TC+ / TC- and switches a 1 kW heater with a 6 °C band. Each sensor warms while its heater is on and cools towards the ambient when it is off.',
    objectives: [
      'Press ▶ Simulate: both heaters start because both sensors are below their setpoints.',
      'Watch each temperature rise to its setpoint, the output switch off, the temperature sag by half the band and the heater return.',
      'Disconnect one thermocouple wire: the controller shows SENSOR BREAK and switches its output off. Why is that the safe failure?',
      'Raise the oven setpoint and widen the band: what happens to the on / off cycle?',
    ],
    project: labProject('proj_fld_thermal_control', 'Thermostat and Temperature Controller', 'Room thermostat and thermocouple controller.', thermalDevices, thermalWires),
  },
  {
    id: 'lab-fld-fire-security',
    title: 'Conventional Fire Alarm Loop and Photocell / PIR Security Light',
    subtitle: 'Detectors and a call point on one loop, and a yard light that needs dark and movement',
    category: 'automation',
    badge: '🔔 Alarm + Light',
    difficulty: 'Intermediate',
    description:
      'Two smoke detectors and a manual call point sit in parallel on one conventional loop. Any of them latches the panel into alarm: the bell sounds until it is silenced and the panel only resets once the loop is clear. The yard light is fed through a photocell and then a PIR sensor, so it only lights when it is dark AND someone is there.',
    objectives: [
      'Press ▶ Simulate, then click detector SD1: the panel latches ALARM and the bell sounds.',
      'Clear the smoke: the alarm stays latched. Silence the bell, then try RESET while the call point is broken: it refuses until the loop is clear.',
      'Set the photocell light level below the threshold, then click the PIR sensor: the yard light comes on and stays for the hold time.',
      'Why is the photocell wired in series ahead of the PIR rather than in parallel?',
    ],
    project: labProject('proj_fld_fire_security', 'Fire Alarm Loop and Security Light', 'Conventional fire loop and photocell / PIR light.', fireDevices, fireWires),
  },
];
