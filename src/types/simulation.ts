export interface SparkEvent {
  id: string;
  x: number;
  y: number;
  severity: 'minor' | 'short_circuit' | 'arc_flash';
  timestamp: number;
  message: string;
}
