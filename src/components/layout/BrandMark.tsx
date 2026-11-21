import React from 'react';

/**
 * WireWise brand mark ("Check Tile", option 5A): a wired compliance check
 * reversed out of a brand-orange tile. Colors follow the theme tokens, so the
 * tile is #b4501c in light mode and #f0884a in dark mode.
 * Source artwork: brand/logo.svg and brand/logo-dark.svg.
 */
export const BrandMark: React.FC<{ className?: string; title?: string }> = ({ className, title = 'WireWise' }) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
    <rect width="64" height="64" rx="15" fill="var(--brand)" />
    <path d="M13 33 26 46 51 19" fill="none" stroke="#fff" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="13" cy="33" r="4.5" fill="var(--brand)" stroke="#fff" strokeWidth={3} />
    <circle cx="51" cy="19" r="4.5" fill="var(--brand)" stroke="#fff" strokeWidth={3} />
    <circle cx="26" cy="46" r="3.6" fill="var(--flag-trip)" />
  </svg>
);
