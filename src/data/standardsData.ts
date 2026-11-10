import { WireGaugeStandard, ConduitFillStandard } from '../types/codes';
import { CodeStandard } from '../types/electrical';

export const PEC_WIRE_STANDARDS: WireGaugeStandard[] = [
  {
    id: 'pec-14awg',
    name: '14 AWG (2.0 mm²)',
    standard: 'PEC',
    crossSectionMm2: 2.08,
    awgEquivalent: '14 AWG',
    ampacityCopper75C: 20,
    maxBreakerAmps: 15, // PEC 240.4(D) limit
    resistanceOhmPerKm: 10.15,
    approxOuterDiameterMm: 3.0,
  },
  {
    id: 'pec-12awg',
    name: '12 AWG (3.5 mm²)',
    standard: 'PEC',
    crossSectionMm2: 3.31,
    awgEquivalent: '12 AWG',
    ampacityCopper75C: 25,
    maxBreakerAmps: 20, // PEC 240.4(D) limit
    resistanceOhmPerKm: 6.38,
    approxOuterDiameterMm: 3.5,
  },
  {
    id: 'pec-10awg',
    name: '10 AWG (5.5 mm²)',
    standard: 'PEC',
    crossSectionMm2: 5.26,
    awgEquivalent: '10 AWG',
    ampacityCopper75C: 35,
    maxBreakerAmps: 30, // PEC 240.4(D) limit
    resistanceOhmPerKm: 4.01,
    approxOuterDiameterMm: 4.3,
  },
  {
    id: 'pec-8awg',
    name: '8 AWG (8.0 mm²)',
    standard: 'PEC',
    crossSectionMm2: 8.37,
    awgEquivalent: '8 AWG',
    ampacityCopper75C: 50,
    maxBreakerAmps: 40,
    resistanceOhmPerKm: 2.52,
    approxOuterDiameterMm: 5.5,
  },
  {
    id: 'pec-6awg',
    name: '6 AWG (14 mm²)',
    standard: 'PEC',
    crossSectionMm2: 13.3,
    awgEquivalent: '6 AWG',
    ampacityCopper75C: 65,
    maxBreakerAmps: 60,
    resistanceOhmPerKm: 1.58,
    approxOuterDiameterMm: 6.8,
  },
  {
    id: 'pec-4awg',
    name: '4 AWG (22 mm²)',
    standard: 'PEC',
    crossSectionMm2: 21.2,
    awgEquivalent: '4 AWG',
    ampacityCopper75C: 85,
    maxBreakerAmps: 80,
    resistanceOhmPerKm: 0.99,
    approxOuterDiameterMm: 8.2,
  }
];

export const IEC_WIRE_STANDARDS: WireGaugeStandard[] = [
  {
    id: 'iec-1.5mm',
    name: '1.5 mm²',
    standard: 'IEC',
    crossSectionMm2: 1.5,
    ampacityCopper75C: 17.5,
    maxBreakerAmps: 16, // Typical domestic lighting/controls
    resistanceOhmPerKm: 12.1,
    approxOuterDiameterMm: 2.8,
  },
  {
    id: 'iec-2.5mm',
    name: '2.5 mm²',
    standard: 'IEC',
    crossSectionMm2: 2.5,
    ampacityCopper75C: 24,
    maxBreakerAmps: 20, // Typical socket circuit
    resistanceOhmPerKm: 7.41,
    approxOuterDiameterMm: 3.4,
  },
  {
    id: 'iec-4.0mm',
    name: '4.0 mm²',
    standard: 'IEC',
    crossSectionMm2: 4.0,
    ampacityCopper75C: 32,
    maxBreakerAmps: 32, // Heavy appliances, small cookers
    resistanceOhmPerKm: 4.61,
    approxOuterDiameterMm: 4.1,
  },
  {
    id: 'iec-6.0mm',
    name: '6.0 mm²',
    standard: 'IEC',
    crossSectionMm2: 6.0,
    ampacityCopper75C: 41,
    maxBreakerAmps: 40, // Cookers, showers, sub-panel feeds
    resistanceOhmPerKm: 3.08,
    approxOuterDiameterMm: 4.8,
  },
  {
    id: 'iec-10.0mm',
    name: '10.0 mm²',
    standard: 'IEC',
    crossSectionMm2: 10.0,
    ampacityCopper75C: 57,
    maxBreakerAmps: 63, // Main distribution feeders
    resistanceOhmPerKm: 1.83,
    approxOuterDiameterMm: 6.0,
  },
  {
    id: 'iec-16.0mm',
    name: '16.0 mm²',
    standard: 'IEC',
    crossSectionMm2: 16.0,
    ampacityCopper75C: 76,
    maxBreakerAmps: 80, // Service entrance conductors
    resistanceOhmPerKm: 1.15,
    approxOuterDiameterMm: 7.2,
  }
];

export const CONDUIT_FILL_STANDARDS: ConduitFillStandard[] = [
  {
    tradeSizeInches: '1/2"',
    metricMm: 20,
    internalAreaMm2: 196,
    maxFillPercent1Wire: 53,
    maxFillPercent2Wires: 31,
    maxFillPercent3PlusWires: 40,
  },
  {
    tradeSizeInches: '3/4"',
    metricMm: 25,
    internalAreaMm2: 343,
    maxFillPercent1Wire: 53,
    maxFillPercent2Wires: 31,
    maxFillPercent3PlusWires: 40,
  },
  {
    tradeSizeInches: '1"',
    metricMm: 32,
    internalAreaMm2: 556,
    maxFillPercent1Wire: 53,
    maxFillPercent2Wires: 31,
    maxFillPercent3PlusWires: 40,
  },
  {
    tradeSizeInches: '1-1/4"',
    metricMm: 40,
    internalAreaMm2: 962,
    maxFillPercent1Wire: 53,
    maxFillPercent2Wires: 31,
    maxFillPercent3PlusWires: 40,
  }
];

export const COLOR_STANDARDS = {
  PEC: {
    phase1: '#dc2626', // Red (or Black)
    phase2: '#2563eb', // Blue
    phase3: '#1e293b', // Black
    neutral: '#94a3b8', // White / Off-white (rendered light gray for canvas visibility)
    neutralDisplay: '#f8fafc',
    earth: '#16a34a',   // Green
    switched: '#d97706',// Yellow / Amber
    names: {
      phase1: 'Hot (Line 1 - Red/Black)',
      phase2: 'Hot (Line 2 - Blue)',
      phase3: 'Hot (Line 3 - Black)',
      neutral: 'Neutral (White/Gray)',
      earth: 'Ground / EGC (Green)',
      switched: 'Switched Hot (Yellow/Red)'
    }
  },
  IEC: {
    phase1: '#854d0e', // Brown
    phase2: '#1e293b', // Black
    phase3: '#64748b', // Grey
    neutral: '#2563eb', // Blue
    neutralDisplay: '#38bdf8',
    earth: '#15803d',   // Green / Yellow
    switched: '#f59e0b',// Amber / Switched
    names: {
      phase1: 'Phase L1 (Brown)',
      phase2: 'Phase L2 (Black)',
      phase3: 'Phase L3 (Grey)',
      neutral: 'Neutral N (Blue)',
      earth: 'Protective Earth PE (Green/Yellow)',
      switched: 'Switched Phase'
    }
  }
};

export function getWireStandards(standard: CodeStandard): WireGaugeStandard[] {
  return standard === 'PEC' ? PEC_WIRE_STANDARDS : IEC_WIRE_STANDARDS;
}

export function getDefaultWireGauge(standard: CodeStandard, circuitType: 'lighting' | 'socket' | 'appliance' | 'feeder'): string {
  if (standard === 'PEC') {
    switch (circuitType) {
      case 'lighting': return '14 AWG (2.0 mm²)';
      case 'socket': return '12 AWG (3.5 mm²)';
      case 'appliance': return '10 AWG (5.5 mm²)';
      case 'feeder': return '8 AWG (8.0 mm²)';
    }
  } else {
    switch (circuitType) {
      case 'lighting': return '1.5 mm²';
      case 'socket': return '2.5 mm²';
      case 'appliance': return '4.0 mm²';
      case 'feeder': return '10.0 mm²';
    }
  }
}
