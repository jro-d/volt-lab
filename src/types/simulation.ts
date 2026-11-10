export interface SimulationNode {
  id: string; // e.g. "dev1:term2"
  deviceId: string;
  terminalId: string;
  voltage: number; // RMS Volts
  potentialType: 'live' | 'neutral' | 'earth' | 'floating' | 'grounded';
  phase?: 'L1' | 'L2' | 'L3';
}

export interface CircuitBranch {
  id: string;
  nodeA: string;
  nodeB: string;
  wireId?: string;
  deviceId?: string;
  impedance: number; // Ohms
  currentAmps: number;
  isClosed: boolean;
}

export interface SparkEvent {
  id: string;
  x: number;
  y: number;
  severity: 'minor' | 'short_circuit' | 'arc_flash';
  timestamp: number;
  message: string;
}

export interface SimulationState {
  isRunning: boolean;
  frequencyHz: number;
  timeMs: number;
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  sparks: SparkEvent[];
  lastFault?: {
    type: 'SHORT_CIRCUIT' | 'OVERLOAD' | 'EARTH_LEAKAGE' | 'OPEN_NEUTRAL';
    deviceId?: string;
    wireId?: string;
    currentAmps: number;
    description: string;
  };
}
