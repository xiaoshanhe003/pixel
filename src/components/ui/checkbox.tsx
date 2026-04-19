import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import type * as React from 'react';
import { Icon } from './Icon';

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

type CheckboxFieldProps = CheckboxProps & {
  label: string;
  description?: string;
  wrapperClassName?: string;
};

export function Checkbox({ className = '', ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={`ui-checkbox${className ? ` ${className}` : ''}`}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="ui-checkbox__indicator">
        <Icon className="ui-checkbox__icon" name="check" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function CheckboxField({
  className = '',
  wrapperClassName = '',
  label,
  description,
  ...props
}: CheckboxFieldProps) {
  return (
    <label className={`ui-checkbox-field${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
      <Checkbox className={className} {...props} />
      <span className="ui-checkbox-field__copy">
        <span className="ui-checkbox-field__label">{label}</span>
        {description ? (
          <span className="ui-checkbox-field__description">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
