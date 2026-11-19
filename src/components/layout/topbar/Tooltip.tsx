import React, { useEffect, useRef, useState } from 'react';

export interface TooltipProps {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
  disabled?: boolean;
  align?: 'center' | 'left' | 'right';
}

const LONG_PRESS_MS = 500;

export const Tooltip: React.FC<TooltipProps> = ({
  label,
  shortcut,
  children,
  disabled = false,
  align = 'center',
}) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (disabled) {
      clearTimer();
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearTimer();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => () => clearTimer(), []);

  const posClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      className="relative inline-flex shrink-0"
      onPointerEnter={(e) => {
        if (disabled || e.pointerType === 'touch') return;
        setOpen(true);
      }}
      onPointerLeave={() => {
        clearTimer();
        setOpen(false);
      }}
      onPointerDown={() => {
        clearTimer();
        setOpen(false);
      }}
      onFocus={() => {
        if (!disabled) setOpen(true);
      }}
      onBlur={() => {
        clearTimer();
        setOpen(false);
      }}
      onTouchStart={() => {
        if (disabled) return;
        clearTimer();
        timerRef.current = window.setTimeout(() => {
          setOpen(true);
        }, LONG_PRESS_MS);
      }}
      onTouchEnd={() => {
        clearTimer();
        window.setTimeout(() => setOpen(false), 1200);
      }}
      onTouchMove={() => {
        clearTimer();
        setOpen(false);
      }}
      onTouchCancel={() => {
        clearTimer();
        setOpen(false);
      }}
    >
      {children}
      {open && !disabled && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute top-full mt-1.5 ${posClass} z-50 flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-border-strong bg-ink px-2 py-1 text-[11px] font-medium text-surface shadow-2 motion-reduce:transition-none`}
        >
          <span>{label}</span>
          {shortcut && (
            <kbd className="rounded-xs bg-surface/15 px-1 py-px font-mono text-[10px] text-surface/90">
              {shortcut}
            </kbd>
          )}
        </span>
      )}
    </span>
  );
};
