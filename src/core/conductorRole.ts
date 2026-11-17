import { DeviceTerminal, ElectricalWire } from '../types/electrical';

export type ConductorRole = NonNullable<ElectricalWire['conductorRole']>;

/**
 * Infers the role of a new wire from the types of the two terminals it joins.
 * Earth wins over neutral, neutral over switched, switched over traveler; anything else is a live feed.
 */
export function inferConductorRole(
  from: Pick<DeviceTerminal, 'type'> | undefined,
  to: Pick<DeviceTerminal, 'type'> | undefined
): ConductorRole {
  const either = (type: DeviceTerminal['type']) => from?.type === type || to?.type === type;
  if (either('earth')) return 'earth_ground';
  if (either('neutral')) return 'return_neutral';
  if (either('switched')) return 'switched_live';
  if (either('traveler')) return 'traveler';
  return 'feed_live';
}
