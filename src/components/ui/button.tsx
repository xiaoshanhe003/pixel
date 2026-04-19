import type * as React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

type ButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  iconOnly?: boolean;
};

type SwatchButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  active?: boolean;
};

export function Button({
  variant = 'tertiary',
  icon,
  iconOnly = false,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    icon ? 'ui-button--with-icon' : '',
    iconOnly ? 'ui-button--icon-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {icon ? <span className="ui-button__icon">{icon}</span> : null}
      {children
        ? iconOnly
          ? children
          : <span className="ui-button__label">{children}</span>
        : null}
    </button>
  );
}

export function SwatchButton({
  active = false,
  className = '',
  type = 'button',
  ...props
}: SwatchButtonProps) {
  const classes = [
    'ui-swatch-button',
    active ? 'is-active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...props} />;
}
