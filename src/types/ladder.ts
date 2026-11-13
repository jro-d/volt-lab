/**
 * Control Ladder Diagram model (NEMA / IEC 2-rail ladder).
 *
 * A rung is a series of blocks followed by one output (coil or pilot lamp).
 * A block holds one or more parallel branches; each branch is a series list of contacts.
 *   - 1 block with 1 branch of 1 element  → a plain series contact
 *   - 1 block with 2 branches              → a parallel (seal-in / latching) branch
 */

export type LadderElementKind = 'NO' | 'NC' | 'COIL' | 'LAMP';

export interface LadderElement {
  id: string;
  kind: LadderElementKind;
  /** Device tag shown above the symbol, e.g. STOP, START, KM1, OLR */
  tag: string;
  /** Contact / terminal reference shown below the symbol, e.g. 13-14, 95-96, A1-A2 */
  sub: string;
  /** Linked physical workbench device (if any) */
  deviceId?: string;
  /** Physical element key on the device, e.g. 'aux_no', 'aux_nc', 'coil', 'stop' */
  contactKey?: string;
}

export interface LadderBlock {
  id: string;
  branches: LadderElement[][];
}

export interface LadderRung {
  id: string;
  label?: string;
  blocks: LadderBlock[];
  output: LadderElement | null;
}

/** General series-parallel expression used for rendering & comparing ladders */
export type LadderNode =
  | { kind: 'el'; el: LadderElement }
  | { kind: 'series'; items: LadderNode[] }
  | { kind: 'parallel'; items: LadderNode[] };
