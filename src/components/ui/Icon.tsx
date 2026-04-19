import type * as React from 'react';
import { ICON_COMPONENTS, type IconName } from '../../utils/icons';

type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
  stroke?: number;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>;

export function Icon({
  name,
  className = '',
  size = 24,
  stroke = 1.8,
  ...props
}: IconProps) {
  const Component = ICON_COMPONENTS[name];

  return (
    <span className={className} aria-hidden="true" {...props}>
      <Component size={size} stroke={stroke} />
    </span>
  );
}
