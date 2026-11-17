/**
 * Conductor colours, VoltLab v2.
 *
 * Projects, lab templates and the compliance checker store wire colours as the v1 hex values
 * (see COLOR_STANDARDS). Those values stay the data; this module maps them to the v2
 * conductor tokens only when drawing, so saved projects keep working.
 */

const LEGACY_TO_TOKEN: Record<string, string> = {
  '#dc2626': 'cond-red',
  '#ef4444': 'cond-red',
  '#2563eb': 'cond-blue',
  '#1e293b': 'cond-black',
  '#0f172a': 'cond-black',
  '#94a3b8': 'cond-white',
  '#f8fafc': 'cond-white',
  '#ffffff': 'cond-white',
  '#16a34a': 'cond-green',
  '#15803d': 'cond-green',
  '#d97706': 'cond-yellow',
  '#f59e0b': 'cond-yellow',
  '#eab308': 'cond-yellow',
  '#854d0e': 'cond-brown',
  '#64748b': 'cond-grey',
  '#ea580c': 'cond-orange',
  '#f97316': 'cond-orange',
  '#8b5cf6': 'port-control',
  '#7c3aed': 'port-control',
  '#06b6d4': 'port-signal',
};

/** The v2 token name for a stored wire colour, or undefined for a custom colour. */
const conductorToken = (stored: string | undefined): string | undefined =>
  stored ? LEGACY_TO_TOKEN[stored.toLowerCase()] : undefined;

/** CSS colour to draw a stored wire colour with. Custom colours pass through unchanged. */
export const conductorColor = (stored: string | undefined): string => {
  const token = conductorToken(stored);
  return token ? `var(--${token})` : stored || 'var(--cond-black)';
};

/** IEC protective earth is green with yellow stripes. */
export const isIecEarth = (stored: string | undefined): boolean => (stored || '').toLowerCase() === '#15803d';
