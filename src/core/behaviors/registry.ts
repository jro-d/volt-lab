import type { DeviceType } from '../../types/electrical';
import type { DeviceBehavior } from './types';
import { meter3pBehavior } from './meter3p';
import { timerModesBehavior } from './timerModes';

const BEHAVIORS: DeviceBehavior[] = [meter3pBehavior, timerModesBehavior];

const byType = new Map<DeviceType, DeviceBehavior>();
for (const b of BEHAVIORS) for (const t of b.types) byType.set(t, b);

export function behaviorFor(type: DeviceType): DeviceBehavior | undefined {
  return byType.get(type);
}
