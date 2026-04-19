import type * as React from 'react';
import { Icon } from './Icon';
type DropdownOption<T extends string | number> = {
  label: string;
  value: T;
};

type DropdownProps<T extends string | number> = {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
  className?: string;
  selectClassName?: string;
  ariaLabel?: string;
};

export function DropdownField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  className = '',
  selectClassName = '',
  ariaLabel,
}: DropdownProps<T>) {
  return (
    <label className={`ui-dropdown${className ? ` ${className}` : ''}`}>
      {hideLabel ? null : <span className="ui-dropdown__label">{label}</span>}
      <span className="ui-dropdown__control">
        <select
          className={`ui-dropdown__select${selectClassName ? ` ${selectClassName}` : ''}`}
          aria-label={ariaLabel ?? label}
          value={String(value)}
          onChange={(event) => {
            const nextValue = options.find(
              (option) => String(option.value) === event.target.value,
            )?.value;

            if (nextValue !== undefined) {
              onChange(nextValue);
            }
          }}
        >
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon className="ui-dropdown__icon" name="chevronDown" />
      </span>
    </label>
  );
}
