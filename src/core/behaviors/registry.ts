import type { DeviceType } from '../../types/electrical';
import type { DeviceBehavior } from './types';
import { meter3pBehavior } from './meter3p';
import { timerModesBehavior } from './timerModes';
import { fuse1pBehavior, fuse3pBehavior } from './fuse';
import { rcboBehavior } from './rcbo';
import { generatorBehavior } from './generator';
import { atsTransferBehavior } from './atsTransfer';
import { floatSwitchBehavior, pressureSwitchBehavior } from './processSwitches';
import { phaseMonitorBehavior } from './phaseMonitor';
import { psuBehavior, dcSensorBehavior, plc24Behavior } from './dcDevices';

const BEHAVIORS: DeviceBehavior[] = [meter3pBehavior, timerModesBehavior, fuse1pBehavior, fuse3pBehavior, rcboBehavior, generatorBehavior, atsTransferBehavior, floatSwitchBehavior, pressureSwitchBehavior, phaseMonitorBehavior, psuBehavior, dcSensorBehavior, plc24Behavior];

const byType = new Map<DeviceType, DeviceBehavior>();
for (const b of BEHAVIORS) for (const t of b.types) byType.set(t, b);

export function behaviorFor(type: DeviceType): DeviceBehavior | undefined {
  return byType.get(type);
}
