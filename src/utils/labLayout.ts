import { ElectricalDevice, ElectricalProject } from '../types/electrical';

/**
 * Passive mounting backdrop hardware that intentionally sits behind/under
 * hosted devices rather than counting as a colliding component.
 */
const MOUNT_DEVICE_TYPES = new Set<string>([
  'din_rail_track',
  'utility_box_surface_pvc',
]);

const MIN_CLEARANCE = 64;
const TARGET_MARGIN_X = 40;
const TARGET_MARGIN_Y = 30;

function snap10(v: number): number {
  return Math.round(v / 10) * 10;
}

function boxesOverlap(a: ElectricalDevice, b: ElectricalDevice): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function pairClearance(a: ElectricalDevice, b: ElectricalDevice): {
  gx: number;
  gy: number;
  clearance: number;
} {
  const gx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width));
  const gy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height));
  return { gx, gy, clearance: Math.max(gx, gy) };
}

function computeMinClearance(devices: ElectricalDevice[]): number {
  let minGap = Infinity;
  for (let i = 0; i < devices.length; i++) {
    for (let j = i + 1; j < devices.length; j++) {
      const { clearance } = pairClearance(devices[i], devices[j]);
      if (clearance < minGap) {
        minGap = clearance;
      }
    }
  }
  return minGap;
}

/**
 * Spreads crowded or overlapping devices in a lab while keeping column/row
 * alignments crisp and keeping DIN rails & utility boxes anchored to their hosts.
 */
export function spreadLabDevices(devices: ElectricalDevice[]): ElectricalDevice[] {
  const activeIndices: number[] = [];
  const mountIndices: number[] = [];

  devices.forEach((d, idx) => {
    if (MOUNT_DEVICE_TYPES.has(d.type)) {
      mountIndices.push(idx);
    } else {
      activeIndices.push(idx);
    }
  });

  if (activeIndices.length <= 1) {
    return devices;
  }

  const activeOrig = activeIndices.map((idx) => devices[idx]);
  const initialMinGap = computeMinClearance(activeOrig);

  // Leave already spacious, hand-tuned layouts untouched
  if (initialMinGap >= MIN_CLEARANCE - 4) {
    return devices;
  }

  // Record which active devices sit inside each mount backdrop before shifting
  const mountHosts = new Map<number, number[]>();
  for (const mIdx of mountIndices) {
    const mountDev = devices[mIdx];
    const hosts = activeIndices.filter((aIdx) => boxesOverlap(mountDev, devices[aIdx]));
    mountHosts.set(mIdx, hosts);
  }

  const cloned = devices.map((d) => ({ ...d }));
  const workActive = activeIndices.map((idx) => cloned[idx]);

  // Step 1: Uniform outward expansion around the active bounding box origin
  // preserves aligned columns/rows (identical x -> identical x).
  let minX = Infinity;
  let minY = Infinity;
  for (const d of workActive) {
    if (d.x < minX) minX = d.x;
    if (d.y < minY) minY = d.y;
  }

  const scale = initialMinGap < 0 ? 1.38 : initialMinGap < 30 ? 1.3 : 1.2;
  for (const d of workActive) {
    d.x = snap10(minX + (d.x - minX) * scale);
    d.y = snap10(minY + (d.y - minY) * scale);
  }

  // Step 2: Deterministic relaxation passes until every non-mount pair has >= MIN_CLEARANCE
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;

    for (let i = 0; i < workActive.length; i++) {
      for (let j = i + 1; j < workActive.length; j++) {
        const a = workActive[i];
        const b = workActive[j];
        const { gx, gy, clearance } = pairClearance(a, b);
        if (clearance >= MIN_CLEARANCE) continue;

        const needX = Math.ceil((MIN_CLEARANCE - gx) / 10) * 10;
        const needY = Math.ceil((MIN_CLEARANCE - gy) / 10) * 10;

        const aCx = a.x + a.width / 2;
        const bCx = b.x + b.width / 2;
        const aCy = a.y + a.height / 2;
        const bCy = b.y + b.height / 2;

        // Slightly favor vertical separation when two devices share roughly the same column
        const sameColumnBias = Math.abs(aCx - bCx) <= 24 ? 0.75 : 1;
        const sameRowBias = Math.abs(aCy - bCy) <= 24 ? 0.75 : 1;

        if (needX * sameRowBias < needY * sameColumnBias) {
          const stepLeft = Math.floor(needX / 2 / 10) * 10;
          const stepRight = needX - stepLeft;
          if (aCx <= bCx) {
            a.x -= stepLeft;
            b.x += stepRight;
          } else {
            b.x -= stepLeft;
            a.x += stepRight;
          }
        } else {
          const stepUp = Math.floor(needY / 2 / 10) * 10;
          const stepDown = needY - stepUp;
          if (aCy <= bCy) {
            a.y -= stepUp;
            b.y += stepDown;
          } else {
            b.y -= stepUp;
            a.y += stepDown;
          }
        }
        moved = true;
      }
    }

    if (!moved) break;
  }

  // Step 3: Keep every active device cleanly inside positive canvas coordinates
  let curMinX = Infinity;
  let curMinY = Infinity;
  for (const d of workActive) {
    if (d.x < curMinX) curMinX = d.x;
    if (d.y < curMinY) curMinY = d.y;
  }
  const shiftX = curMinX < TARGET_MARGIN_X ? Math.ceil((TARGET_MARGIN_X - curMinX) / 10) * 10 : 0;
  const shiftY = curMinY < TARGET_MARGIN_Y ? Math.ceil((TARGET_MARGIN_Y - curMinY) / 10) * 10 : 0;
  if (shiftX !== 0 || shiftY !== 0) {
    for (const d of workActive) {
      d.x += shiftX;
      d.y += shiftY;
    }
  }

  // Step 4: Re-anchor mounting hardware (DIN rails & surface utility boxes) to their hosted devices
  for (const mIdx of mountIndices) {
    const mount = cloned[mIdx];
    const origMount = devices[mIdx];
    const hosts = mountHosts.get(mIdx) || [];
    if (hosts.length === 0) continue;

    let origHostMinX = Infinity;
    let origHostMaxX = -Infinity;
    let origHostSumCy = 0;

    let newHostMinX = Infinity;
    let newHostMaxX = -Infinity;
    let newHostSumCy = 0;

    for (const hIdx of hosts) {
      const oh = devices[hIdx];
      const nh = cloned[hIdx];
      origHostMinX = Math.min(origHostMinX, oh.x);
      origHostMaxX = Math.max(origHostMaxX, oh.x + oh.width);
      origHostSumCy += oh.y + oh.height / 2;

      newHostMinX = Math.min(newHostMinX, nh.x);
      newHostMaxX = Math.max(newHostMaxX, nh.x + nh.width);
      newHostSumCy += nh.y + nh.height / 2;
    }

    const leftPad = Math.max(8, origHostMinX - origMount.x);
    const rightPad = Math.max(8, origMount.x + origMount.width - origHostMaxX);
    const dy = snap10(newHostSumCy / hosts.length - origHostSumCy / hosts.length);

    if (mount.type === 'din_rail_track' && hosts.length > 1) {
      mount.x = newHostMinX - leftPad;
      mount.width = Math.max(origMount.width, newHostMaxX - newHostMinX + leftPad + rightPad);
      mount.y = origMount.y + dy;
    } else {
      const dx = snap10(
        (newHostMinX + newHostMaxX) / 2 - (origHostMinX + origHostMaxX) / 2
      );
      mount.x = origMount.x + dx;
      mount.y = origMount.y + dy;
    }
  }

  return cloned;
}

/**
 * Ensures all example curriculum labs have clean component separation and
 * unobstructed orthogonal wiring space.
 */
export function normalizeLabLayouts<T extends { project: ElectricalProject }>(labs: T[]): T[] {
  return labs.map((lab) => {
    const nextDevices = spreadLabDevices(lab.project.devices);
    if (nextDevices === lab.project.devices) {
      return lab;
    }
    return {
      ...lab,
      project: {
        ...lab.project,
        devices: nextDevices,
      },
    };
  });
}
