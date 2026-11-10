import { ElectricalDevice, DeviceTerminal } from '../types/electrical';

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates absolute terminal position and exit departure direction taking into account device rotation (0, 90, 180, 270 degrees).
 */
export function getDeviceTerminalPosition(
  device: ElectricalDevice,
  terminal: DeviceTerminal
): { x: number; y: number; dir: 'up' | 'down' | 'left' | 'right' } {
  const rot = ((device.rotation || 0) % 360 + 360) % 360;
  const cx = device.x + device.width / 2;
  const cy = device.y + device.height / 2;

  // Local offset from device center
  const dx = (terminal.relX - 0.5) * device.width;
  const dy = (terminal.relY - 0.5) * device.height;

  // Rotated offset around center
  let rx = dx;
  let ry = dy;
  if (rot === 90) {
    rx = -dy;
    ry = dx;
  } else if (rot === 180) {
    rx = -dx;
    ry = -dy;
  } else if (rot === 270) {
    rx = dy;
    ry = -dx;
  }

  // Base exit direction
  let baseDir: 'up' | 'down' | 'left' | 'right' = terminal.relY > 0.5 ? 'down' : 'up';
  if (terminal.relX < 0.08) baseDir = 'left';
  else if (terminal.relX > 0.92) baseDir = 'right';

  // Rotate exit direction
  const dirs: ('up' | 'right' | 'down' | 'left')[] = ['up', 'right', 'down', 'left'];
  const baseIdx = dirs.indexOf(baseDir);
  const steps = Math.round(rot / 90) % 4;
  const dir = dirs[(baseIdx + steps) % 4];

  return {
    x: Math.round((cx + rx) * 10) / 10,
    y: Math.round((cy + ry) * 10) / 10,
    dir,
  };
}

/**
 * Calculates a clean orthogonal (90-degree Manhattan) electrical wiring path between two terminal points.
 * Guarantees physical clearance out of the terminal in its designated exit direction (up/down/left/right),
 * ensuring wires exiting bottom terminals always route under the device without cutting horizontally across it.
 */
export function calculateOrthogonalPath(
  start: Point,
  end: Point,
  startDir: 'up' | 'down' | 'left' | 'right' = 'down',
  endDir: 'up' | 'down' | 'left' | 'right' = 'up',
  startLeadOut: number = 34,
  endLeadOut: number = 34
): Point[] {
  // If practically coincident
  if (Math.hypot(end.x - start.x, end.y - start.y) < 2) {
    return [start, end];
  }

  const points: Point[] = [start];

  // Helper to append a point only if not duplicate of the previous point
  const pushPt = (pt: Point) => {
    const last = points[points.length - 1];
    if (!last || Math.abs(last.x - pt.x) > 0.5 || Math.abs(last.y - pt.y) > 0.5) {
      points.push({ x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 });
    }
  };

  // 1. Initial departure point along startDir
  const p1: Point = { ...start };
  switch (startDir) {
    case 'up': p1.y -= startLeadOut; break;
    case 'down': p1.y += startLeadOut; break;
    case 'left': p1.x -= startLeadOut; break;
    case 'right': p1.x += startLeadOut; break;
  }
  pushPt(p1);

  // 2. Final arrival point before end along endDir
  const p2: Point = { ...end };
  switch (endDir) {
    case 'up': p2.y -= endLeadOut; break;
    case 'down': p2.y += endLeadOut; break;
    case 'left': p2.x -= endLeadOut; break;
    case 'right': p2.x += endLeadOut; break;
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // 3. Connect p1 and p2 with guaranteed clearance
  if (startDir === 'down' && endDir === 'down') {
    // Both terminals exit downwards at the bottom of devices.
    // The horizontal trunk MUST run strictly BELOW both terminals!
    const trunkY = Math.max(p1.y, p2.y);
    pushPt({ x: p1.x, y: trunkY });
    pushPt({ x: p2.x, y: trunkY });
  } else if (startDir === 'up' && endDir === 'up') {
    // Both terminals exit upwards at the top of devices.
    // The horizontal trunk MUST run strictly ABOVE both terminals!
    const trunkY = Math.min(p1.y, p2.y);
    pushPt({ x: p1.x, y: trunkY });
    pushPt({ x: p2.x, y: trunkY });
  } else if (startDir === 'down' && endDir === 'up') {
    // Start exits down (below start device); End arrives from above (above target device)
    if (p2.y >= p1.y) {
      // Normal flow: target device is lower than start device
      const midY = (p1.y + p2.y) / 2;
      pushPt({ x: p1.x, y: midY });
      pushPt({ x: p2.x, y: midY });
    } else {
      // Target device is at same height or higher than start device!
      // Must drop DOWN under the start device, run horizontally under it to a vertical channel,
      // rise up between devices to above target, and enter target from above.
      const channelX = Math.abs(dx) > 20 ? p1.x + dx / 2 : p1.x + (dx >= 0 ? 35 : -35);
      pushPt({ x: channelX, y: p1.y });
      pushPt({ x: channelX, y: p2.y });
      pushPt({ x: p2.x, y: p2.y });
    }
  } else if (startDir === 'up' && endDir === 'down') {
    // Start exits up; End arrives from below
    if (p1.y >= p2.y) {
      // Normal flow: start device is lower than target device
      const midY = (p1.y + p2.y) / 2;
      pushPt({ x: p1.x, y: midY });
      pushPt({ x: p2.x, y: midY });
    } else {
      // Target device is lower than start device
      const channelX = Math.abs(dx) > 20 ? p1.x + dx / 2 : p1.x + (dx >= 0 ? 35 : -35);
      pushPt({ x: channelX, y: p1.y });
      pushPt({ x: channelX, y: p2.y });
      pushPt({ x: p2.x, y: p2.y });
    }
  } else if (startDir === 'left' || startDir === 'right') {
    if (endDir === 'left' || endDir === 'right') {
      const trunkX = startDir === 'right' && endDir === 'right'
        ? Math.max(p1.x, p2.x)
        : startDir === 'left' && endDir === 'left'
        ? Math.min(p1.x, p2.x)
        : (p1.x + p2.x) / 2;
      pushPt({ x: trunkX, y: p1.y });
      pushPt({ x: trunkX, y: p2.y });
    } else {
      pushPt({ x: p2.x, y: p1.y });
    }
  } else {
    // Start vertical, End horizontal
    pushPt({ x: p1.x, y: p2.y });
  }

  pushPt(p2);
  pushPt(end);

  return simplifyPath(points);
}

export function simplifyPath(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Check if prev, curr, and next are collinear (same X or same Y)
    const isCollinearX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const isCollinearY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;

    // IMPORTANT: Only eliminate intermediate points when moving in the SAME direction along the line!
    // Never eliminate a reversal or peak bend!
    if (isCollinearX) {
      const movedSameDirection = (curr.y - prev.y) * (next.y - curr.y) > 0;
      if (movedSameDirection) continue;
    } else if (isCollinearY) {
      const movedSameDirection = (curr.x - prev.x) * (next.x - curr.x) > 0;
      if (movedSameDirection) continue;
    }

    result.push(curr);
  }

  result.push(points[points.length - 1]);
  return result;
}

export function generateSvgPath(points: Point[], cornerRadius: number = 8): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const d1 = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
    const d2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.hypot(d1.x, d1.y);
    const len2 = Math.hypot(d2.x, d2.y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r > 1) {
      const startX = pCurr.x - (d1.x / len1) * r;
      const startY = pCurr.y - (d1.y / len1) * r;
      const endX = pCurr.x + (d2.x / len2) * r;
      const endY = pCurr.y + (d2.y / len2) * r;

      d += ` L ${startX} ${startY} Q ${pCurr.x} ${pCurr.y} ${endX} ${endY}`;
    } else {
      d += ` L ${pCurr.x} ${pCurr.y}`;
    }
  }

  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}
