import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import type * as React from 'react';

const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l9 -9" /></svg>`;

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
        <span
          className="ui-checkbox__icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: CHECK_SVG }}
        />
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
