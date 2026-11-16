import { DeviceType, ElectricalDevice } from '../types/electrical';
import { COMPONENT_CATALOG } from '../data/defaultComponents';

/**
 * Upgrades devices from projects saved by older VoltLab versions.
 *
 * VoltLab now models every device as a brand-neutral "standard" device. Older saves may
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
