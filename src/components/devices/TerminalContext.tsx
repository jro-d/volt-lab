import React from 'react';

export interface HighlightedEndpointInfo {
  role: 'FROM' | 'TO';
  label: string;
  wireColor: string;
  gauge: string;
}

export interface TerminalHighlightContextValue {
  connectedTerminalKeys: Set<string>;
  highlightedWireEndpoints: Map<string, HighlightedEndpointInfo>;
  selectedWireColor: string | null;
  /** Invoked on right-click of a terminal ONLY when >= 1 wire is connected to it */
  onPortContextMenu?: (deviceId: string, terminalId: string, clientX: number, clientY: number) => void;
}

export const DeviceIdContext = React.createContext<string | null>(null);

export const TerminalHighlightContext = React.createContext<TerminalHighlightContextValue>({
  connectedTerminalKeys: new Set(),
  highlightedWireEndpoints: new Map(),
  selectedWireColor: null,
});
