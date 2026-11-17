import { DeviceType, ElectricalDevice, ElectricalWire } from '../types/electrical';
import { COMPONENT_CATALOG, createDeviceFromCatalog } from '../data/defaultComponents';

/**
 * Upgrades devices from projects saved by older versions of the app.
 *
 * Every device is now modelled as a brand-neutral "standard" device. Older saves may
 * still carry manufacturer-specific device types, breaker profiles, brand fields and model
 * numbers; this maps them onto the current standard catalogue so they keep loading.
 */
const LEGACY_TYPES: Record<string, DeviceType> = {
  royu_safety_breaker_2p: 'safety_breaker_2p',
  royu_modular_combo_plate: 'modular_combo_plate',
  wago_connector_3p: 'lever_connector_3p',
};

const BRAND_PATTERN = /\b(ROYU|Schneider|Siemens|WAGO(?: 221)?|TeSys|SIRIUS|Acti9)\b/gi;
const hasBrand = (text: string) => new RegExp(BRAND_PATTERN.source, 'i').test(text);

export function migrateLegacyDevices(devices: ElectricalDevice[]): ElectricalDevice[] {
  return devices.map((raw) => {
    const dev: ElectricalDevice & { brand?: unknown } = { ...raw, state: { ...raw.state } };
    const type = LEGACY_TYPES[dev.type as string] || dev.type;
    dev.type = type;
    const def = COMPONENT_CATALOG.find((c) => c.type === type);

    // Brand field is gone; describe the device by its product standard instead
    delete dev.brand;
    if (!dev.productStandard && def?.productStandard) dev.productStandard = def.productStandard;
    if (dev.modelNumber && hasBrand(dev.modelNumber)) dev.modelNumber = def?.modelNumber;
    if (dev.name && hasBrand(dev.name)) {
      const stripped = dev.name.replace(BRAND_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
      dev.name = stripped || def?.name || dev.name;
    }

    // MCB form factor: three legacy profiles collapse into bolt-on / DIN-rail
    const profile = dev.state.breakerProfile as string | undefined;
    if (profile && profile !== 'bolt_on' && profile !== 'din_rail') {
      dev.state.breakerProfile = profile.includes('bolt') ? 'bolt_on' : 'din_rail';
      if (dev.type.startsWith('mcb_') && dev.state.breakerProfile === 'din_rail') {
        const poles = dev.type === 'mcb_3p' ? '3P' : dev.type === 'mcb_1p' ? '1P' : '2P';
        dev.productStandard = 'IEC 60898-1';
        dev.modelNumber = `MCB ${poles} DIN-Rail`;
        dev.mountingType = 'din_rail';
      }
    }

    if (dev.terminals?.some((t) => t.spliceGroup === 'wago')) {
      dev.terminals = dev.terminals.map((t) => (t.spliceGroup === 'wago' ? { ...t, spliceGroup: 'lever' } : t));
    }
    return dev;
  });
}

/**
 * Device types that were removed and replaced by another device, with the terminal id each old
 * terminal maps to. Wires attached to a converted device are re-pointed through this table.
 */
const REPLACED_DEVICES: Record<string, { to: DeviceType; terminals: Record<string, string> }> = {
  motor_3phase_dol: { to: 'motor_ac_industrial', terminals: { l1: 'u1', l2: 'v1', l3: 'w1', pe: 'pe' } },
  // The generic junction box never had a catalog entry; its splice terminals share the octagonal box's ids
  junction_box: { to: 'junction_box_octagonal_orange', terminals: {} },
};

/**
 * Upgrades a whole saved project (devices and wires). Devices of a removed type are rebuilt from the
 * replacement catalog entry (keeping id, position, rotation and wattage), and wires that ended on them
 * are re-pointed at the matching terminal. Call this from every load path.
 */
export function migrateLegacyProject(
  devices: ElectricalDevice[],
  wires: ElectricalWire[]
): { devices: ElectricalDevice[]; wires: ElectricalWire[] } {
  const remap: Record<string, Record<string, string>> = {};
  // Wire ends that move to a different device (panelboard bus bars become two separate bus bars)
  const moved: Record<string, Record<string, { deviceId: string; terminalId: string }>> = {};

  const splitDevices: ElectricalDevice[] = [];
  for (const dev of devices) {
    if ((dev.type as string) !== 'panelboard_frame') {
      splitDevices.push(dev);
      continue;
    }
    // The old panelboard frame only offered a neutral and an earth bus terminal, so it becomes
    // a neutral bus bar (keeps the id) plus an earth bus bar placed beside it.
    const neutralBar = createDeviceFromCatalog('neutral_busbar', dev.x + 33, dev.y + 40, dev.id);
    const earthBar = createDeviceFromCatalog('earth_busbar', dev.x + 277, dev.y + 40, `${dev.id}_pe`);
    if (dev.rotation) {
      neutralBar.rotation = dev.rotation;
      earthBar.rotation = dev.rotation;
    }
    splitDevices.push(neutralBar, earthBar);
    moved[dev.id] = {
      n_bus: { deviceId: neutralBar.id, terminalId: 'n_main' },
      pe_bus: { deviceId: earthBar.id, terminalId: 'pe_main' },
    };
  }

  const converted = splitDevices.map((dev) => {
    const rule = REPLACED_DEVICES[dev.type as string];
    if (!rule) return dev;
    const fresh = createDeviceFromCatalog(rule.to, dev.x, dev.y, dev.id);
    if (dev.rotation) fresh.rotation = dev.rotation;
    if (typeof dev.state?.wattage === 'number') fresh.state.wattage = dev.state.wattage;
    remap[dev.id] = rule.terminals;
    return fresh;
  });

  const fixedWires = wires.map((w) => {
    const mFrom = moved[w.fromDeviceId]?.[w.fromTerminalId];
    const mTo = moved[w.toDeviceId]?.[w.toTerminalId];
    if (mFrom || mTo) {
      return {
        ...w,
        ...(mFrom ? { fromDeviceId: mFrom.deviceId, fromTerminalId: mFrom.terminalId } : {}),
        ...(mTo ? { toDeviceId: mTo.deviceId, toTerminalId: mTo.terminalId } : {}),
      };
    }
    const from = remap[w.fromDeviceId]?.[w.fromTerminalId];
    const to = remap[w.toDeviceId]?.[w.toTerminalId];
    return from || to
      ? { ...w, fromTerminalId: from ?? w.fromTerminalId, toTerminalId: to ?? w.toTerminalId }
      : w;
  });

  // Drop wires whose end terminal does not exist on the replacement device
  const termsById = new Map<string, Set<string>>();
  for (const dev of converted) termsById.set(dev.id, new Set(dev.terminals.map((t) => t.id)));
  const validWires = fixedWires.filter(
    (w) =>
      !((w.fromDeviceId in remap || w.fromDeviceId in moved) && !termsById.get(w.fromDeviceId)?.has(w.fromTerminalId)) &&
      !((w.toDeviceId in remap || w.toDeviceId in moved) && !termsById.get(w.toDeviceId)?.has(w.toTerminalId))
  );

  return { devices: migrateLegacyDevices(converted), wires: validWires };
}
