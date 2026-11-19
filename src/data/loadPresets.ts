/**
 * Presets for the merged load families of batch 3.6: lamp types on `light_bulb` and appliance kinds on
 * `appliance_generic`. Applying a preset writes these values into the device state.
 */

export interface LampPreset {
  label: string;
  wattage: number;
  pf: number;
  /** Switch-on current multiple (informational) */
  inrush: number;
  note: string;
}

export const LAMP_TYPES: Record<string, LampPreset> = {
  incandescent: { label: 'Incandescent', wattage: 60, pf: 1, inrush: 10, note: 'Resistive: unity power factor; the cold filament draws about ten times its running current for a moment.' },
  led: { label: 'LED lamp', wattage: 9, pf: 0.9, inrush: 20, note: 'Low power, power factor about 0.9 with a driver; the driver capacitor gives a brief inrush.' },
  fluorescent: { label: 'Fluorescent tube (ballast + starter)', wattage: 36, pf: 0.5, inrush: 2, note: 'The ballast power factor is about 0.5 uncorrected (current is twice what the watts suggest) and the starter flickers for a second or two before the tube strikes.' },
  cfl: { label: 'Compact fluorescent (CFL)', wattage: 15, pf: 0.55, inrush: 5, note: 'Electronic ballast: low power factor, slow warm-up to full light.' },
  halogen: { label: 'Halogen', wattage: 50, pf: 1, inrush: 10, note: 'Resistive and very hot: unity power factor.' },
};

export interface AppliancePreset {
  label: string;
  wattage: number;
  pf: number;
  note: string;
}

export const APPLIANCE_KINDS: Record<string, AppliancePreset> = {
  range: { label: 'Electric range', wattage: 8000, pf: 1, note: 'Elements cycle on a thermostat (40 s on, 20 s off). A dedicated circuit is normal practice: verify the rule in your copy of the code.' },
  refrigerator: { label: 'Refrigerator', wattage: 150, pf: 0.8, note: 'The compressor cycles (30 s on, 30 s off) with a small standby load in between.' },
  washing_machine: { label: 'Washing machine', wattage: 2000, pf: 0.7, note: 'Program: fill, heat, wash, spin, then idle until the power is cycled.' },
  rice_cooker: { label: 'Rice cooker', wattage: 700, pf: 1, note: 'Cooks at full power for the cook time, then keeps warm at 60 W.' },
  microwave: { label: 'Microwave oven', wattage: 1200, pf: 0.9, note: 'Click START on the device or set the timer: it draws full power while the timer runs.' },
  ev_charger: { label: 'EV charger 7 kW (230 V)', wattage: 7200, pf: 1, note: 'A continuous load: use its own circuit. Leakage-protection requirements for EV charging: verify against your copy of the code.' },
};

/** Power strip appliances (watts) by plugged kind */
export const STRIP_LOADS: Record<string, number> = { none: 0, tv: 120, charger: 10, iron: 1200, heater: 1500, kettle: 2000 };
