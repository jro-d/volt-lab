import React from 'react';
import { Tooltip } from './Tooltip';

export interface IconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  size?: 'md' | 'touch';
  text?: string;
  className?: string;
  alignTooltip?: 'center' | 'left' | 'right';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      label,
      shortcut,
      onClick,
      disabled = false,
      active,
      danger = false,
      size = 'md',
      text,
      className = '',
      alignTooltip = 'center',
    },
    ref
  ) => {
    const sizeClass = size === 'touch' ? 'h-11 min-w-[44px] px-2.5' : 'h-8 min-w-[32px] px-2';
    const toneClass = disabled
      ? 'bg-transparent border-transparent text-ink-faint cursor-not-allowed'
      : active
      ? 'bg-probe text-on-probe border-probe shadow-1'
      : danger
      ? 'bg-surface border-border text-danger hover:bg-danger-soft hover:border-danger/40 shadow-1'
      : 'bg-surface border-border text-ink hover:bg-surface-hover hover:border-border-strong shadow-1';

    return (
      <Tooltip label={label} shortcut={shortcut} align={alignTooltip}>
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={typeof active === 'boolean' ? active : undefined}
          className={`flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition motion-reduce:transition-none shrink-0 focus-visible:outline-none focus-visible:shadow-focus ${sizeClass} ${toneClass} ${className}`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {text && <span>{text}</span>}
        </button>
      </Tooltip>
    );
  }
);

IconButton.displayName = 'IconButton';
