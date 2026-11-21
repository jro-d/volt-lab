import { useEffect, useState } from 'react';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

const DESKTOP_QUERY = '(min-width: 1280px)';
const TABLET_QUERY = '(min-width: 768px)';

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop';
  }
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'phone';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const desktopMql = window.matchMedia(DESKTOP_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);
    const update = () => setBreakpoint(getBreakpoint());

    update();
    desktopMql.addEventListener('change', update);
    tabletMql.addEventListener('change', update);
    return () => {
      desktopMql.removeEventListener('change', update);
      tabletMql.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}
