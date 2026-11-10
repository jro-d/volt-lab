import { CodeStandard } from './electrical';

export interface WireGaugeStandard {
  id: string;
  name: string;
  standard: CodeStandard;
  crossSectionMm2: number;
  awgEquivalent?: string;
  ampacityCopper75C: number; // Amps rating (THHN/THWN or PVC in conduit)
  maxBreakerAmps: number;    // PEC 240.4(D) / IEC limit
  resistanceOhmPerKm: number; // at 75°C
  approxOuterDiameterMm: number;
}

export interface ConduitFillStandard {
  tradeSizeInches: string;
  metricMm: number;
  internalAreaMm2: number;
  maxFillPercent1Wire: number;  // 53%
  maxFillPercent2Wires: number; // 31%
  maxFillPercent3PlusWires: number; // 40%
}

export interface CodeViolation {
  id: string;
  codeStandard: CodeStandard;
  severity: 'error' | 'warning' | 'info';
  category: 'ampacity' | 'voltage_drop' | 'conduit_fill' | 'grounding' | 'color_code' | 'polarity' | 'shock_hazard';
  hazardLevel?: 'fatal_electrocution' | 'touch_shock' | 'fire_risk' | 'code_infraction';
  articleRef: string; // e.g. "PEC 2.40.1.4(D)" or "IEC 60364-5-52"
  title: string;
  message: string;
  affectedDeviceId?: string;
  affectedWireId?: string;
  recommendation: string;
}

export interface ElectricalAnalysisReport {
  totalConnectedWatts: number;
  totalCurrentAmps: number;
  maxBranchVoltageDropPercent: number;
  violations: CodeViolation[];
  conduitFillPercent?: number;
  isCompliant: boolean;
  activeStandards: CodeStandard;
}
